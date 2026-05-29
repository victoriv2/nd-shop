require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many OTP requests from this IP.' }
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Access Denied: No token provided.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Access Denied: Invalid token.' });
        req.user = user;
        next();
    });
};

const optionalToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        req.user = null;
        return next();
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        req.user = err ? null : user;
        next();
    });
};
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 5000;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const fetch = require('cross-fetch');
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    },
    global: {
        fetch: fetch
    }
});

// Simple in-memory store for OTPs
// Structure: { "contact@example.com": { code: "1234", expiresAt: 16... } }
const otpStore = {};

// Helper function to generate a 4-digit OTP
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

app.post('/api/send-otp', otpLimiter, async (req, res) => {
    const { method, contact, name } = req.body;

    if (!contact) {
        return res.status(400).json({ success: false, error: 'Contact information is missing.' });
    }

    const code = generateOTP();
    
    // Store OTP with an expiration time of 5 minutes
    otpStore[contact] = {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes in milliseconds
    };

    const headers = {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
    };

    try {
        if (method === 'email') {
            const emailData = {
                sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
                to: [{ email: contact, name: name || 'User' }],
                subject: "Your ND Shop Verification Code",
                htmlContent: `<html><body><p>Hello,</p><p>Your 4-digit verification code is: <strong style="font-size: 24px;">${code}</strong></p><p>This code will expire in 5 minutes.</p></body></html>`
            };

            await axios.post('https://api.brevo.com/v3/smtp/email', emailData, { headers });
            
        } else if (method === 'sms') {
            const smsData = {
                type: "transactional",
                unicodeEnabled: false,
                sender: BREVO_SENDER_NAME.substring(0, 11), // Sender max 11 chars
                recipient: contact,
                content: `Your ND Shop verification code is: ${code}. It expires in 5 mins.`
            };

            await axios.post('https://api.brevo.com/v3/transactionalSMS/sms', smsData, { headers });
        } else {
            return res.status(400).json({ success: false, error: 'Invalid method.' });
        }

        res.json({ success: true, message: 'OTP sent successfully.' });
    } catch (error) {
        console.error('Error sending OTP:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: 'Failed to send OTP.', details: error.response?.data });
    }
});

app.post('/api/verify-otp', otpLimiter, (req, res) => {
    const { contact, code } = req.body;

    if (!contact || !code) {
        return res.status(400).json({ success: false, error: 'Contact and code are required.' });
    }

    const record = otpStore[contact];

    if (!record) {
        return res.status(400).json({ success: false, error: 'No OTP found for this contact. Please request a new one.' });
    }

    if (Date.now() > record.expiresAt) {
        delete otpStore[contact];
        return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    }

    if (record.code === code) {
        // Code matches
        delete otpStore[contact]; // Remove after successful verification
        return res.json({ success: true, message: 'OTP verified successfully.' });
    } else {
        return res.status(400).json({ success: false, error: 'Invalid OTP.' });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, firstName, middleName, lastName, email, phone, password, address, state, lga } = req.body;
        
        if (!name || (!email && !phone) || !password) {
            return res.status(400).json({ success: false, error: 'Missing required fields.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate ID: nd00001 format
        const { data: usersData, error: fetchError } = await supabase
            .from('users')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);
            
        let newId = 'nd00001';
        if (!fetchError && usersData && usersData.length > 0) {
            const lastIdStr = usersData[0].id;
            const lastNum = parseInt(lastIdStr.replace('nd', ''));
            if (!isNaN(lastNum)) {
                newId = 'nd' + (lastNum + 1).toString().padStart(5, '0');
            }
        }

        const newUser = {
            id: newId,
            name,
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            email: email || null,
            phone: phone || null,
            password: hashedPassword,
            address,
            state,
            lga,
            join_date: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('users')
            .insert([newUser]);

        if (error) {
            console.error('Supabase Insert Error:', error);
            if (error.code === '23505') { // unique violation
                if (error.details.includes('email')) {
                    return res.status(400).json({ success: false, error: 'Email already in use.' });
                }
                if (error.details.includes('phone')) {
                    return res.status(400).json({ success: false, error: 'Phone number already in use.' });
                }
            }
            return res.status(500).json({ success: false, error: 'Failed to create user.' });
        }

        // Exclude password before sending back
        const { password: _, ...safeUser } = newUser;
        // Remap to camelCase for frontend
        const frontendUser = {
            id: safeUser.id,
            name: safeUser.name,
            firstName: safeUser.first_name,
            middleName: safeUser.middle_name,
            lastName: safeUser.last_name,
            email: safeUser.email,
            phone: safeUser.phone,
            address: safeUser.address,
            state: safeUser.state,
            lga: safeUser.lga,
            joinDate: safeUser.join_date
        };

        const token = jwt.sign({ id: frontendUser.id, is_admin: false }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, message: 'User registered successfully.', user: frontendUser, token });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ success: false, error: 'Identifier and password are required.' });
        }

        // Query by email or phone
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${identifier},phone.eq.${identifier}`)
            .limit(1);

        if (error) {
            console.error('Supabase Select Error:', error);
            return res.status(500).json({ success: false, error: 'Database error.' });
        }

        if (!users || users.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid Credentials' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ success: false, error: 'Invalid Credentials' });
        }

        // Return user data (excluding password)
        const { password: _, ...safeUser } = user;
        
        // Map snake_case to camelCase for the frontend
        const frontendUser = {
            id: safeUser.id,
            name: safeUser.name,
            firstName: safeUser.first_name,
            middleName: safeUser.middle_name,
            lastName: safeUser.last_name,
            email: safeUser.email,
            phone: safeUser.phone,
            address: safeUser.address,
            state: safeUser.state,
            lga: safeUser.lga,
            joinDate: safeUser.join_date
        };

        const token = jwt.sign({ id: frontendUser.id, is_admin: safeUser.is_admin }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, user: frontendUser, token });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.post('/api/admin-login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ success: false, error: 'Identifier and password are required.' });
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${identifier},phone.eq.${identifier}`)
            .eq('is_admin', true)
            .limit(1);

        if (error) {
            console.error('Admin Login Error:', error);
            return res.status(500).json({ success: false, error: 'Database error.' });
        }

        if (!users || users.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid Admin Credentials' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ success: false, error: 'Invalid Admin Credentials' });
        }

        const token = jwt.sign({ id: user.id, is_admin: true }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, admin: { id: user.id, email: user.email, name: user.name }, token });

    } catch (err) {
        console.error('Admin Login error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.post('/api/update-user', authenticateToken, async (req, res) => {
    try {
        const { id, firstName, lastName, address, state, lga, name } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, error: 'User ID is required.' });
        }

        const { data, error } = await supabase
            .from('users')
            .update({
                first_name: firstName,
                last_name: lastName,
                address: address,
                state: state,
                lga: lga,
                name: name
            })
            .eq('id', id);

        if (error) {
            console.error('Update User Error:', error);
            return res.status(500).json({ success: false, error: 'Failed to update user profile.' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Update User error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) {
            throw error;
        }

        const frontendUsers = data.map(u => ({
            id: u.id,
            name: u.name,
            firstName: u.first_name,
            middleName: u.middle_name,
            lastName: u.last_name,
            joinDate: u.join_date,
            is_admin: u.is_admin
        }));

        res.json({ success: true, users: frontendUsers });
    } catch (err) {
        console.error('Fetch users error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});


// ========================================
// OFFLINE-FIRST SYNC ENGINE ROUTES
// ========================================

// 1. Sync UP: Receives a batch of key-value pairs from the frontend's localStorage and saves them to admin_settings table.
app.post('/api/sync/up', authenticateToken, async (req, res) => {
    try {
        const { updates } = req.body; // Array of { key, value }
        
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ success: false, error: 'Invalid updates payload' });
        }

        // We use the admin_settings table as our generic key-value store.
        // It has columns: key (text, PK), value (jsonb), updated_at (timestamptz)
        
        for (const item of updates) {
            let parsedValue = item.value;
            // Parse strings back into JSON if possible, so they are stored as real JSONB in Supabase
            if (typeof item.value === 'string') {
                try {
                    parsedValue = JSON.parse(item.value);
                } catch (e) {
                    // keep as string if it's not valid JSON
                }
            }
            
            const { error } = await supabase
                .from('admin_settings')
                .upsert({ 
                    key: item.key, 
                    value: parsedValue,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
                
            if (error) {
                console.error('Error upserting key:', item.key, error);
            }
        }

        res.json({ success: true, message: 'Sync complete' });
    } catch (err) {
        console.error('Sync Up Error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

// 2. Sync DOWN: Sends all data from admin_settings to the frontend to populate localStorage
app.get('/api/sync/down', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('*');

        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch data' });
        }

        const state = {};
        data.forEach(item => {
            // Convert JSONB back to string if it was an object/array, to match localStorage expectations
            state[item.key] = typeof item.value === 'object' ? JSON.stringify(item.value) : item.value;
        });

        res.json({ success: true, state });
    } catch (err) {
        console.error('Sync Down Error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

// 3. Upload Media: Upload base64 or file to Supabase Storage and return URL
// We'll accept base64 payloads since the frontend currently has image data in base64 format.
app.post('/api/upload', authenticateToken, async (req, res) => {
    try {
        const { fileData, fileName, mimeType } = req.body;
        
        if (!fileData) {
            return res.status(400).json({ success: false, error: 'No file data provided' });
        }

        // Decode base64
        // fileData usually looks like "data:image/png;base64,iVBORw0K..."
        let base64String = fileData;
        let finalMimeType = mimeType || 'application/octet-stream';
        
        if (fileData.includes('base64,')) {
            const parts = fileData.split('base64,');
            finalMimeType = parts[0].replace('data:', '').replace(';', '') || finalMimeType;
            base64String = parts[1];
        }

        const buffer = Buffer.from(base64String, 'base64');
        const uniqueFileName = `${Date.now()}-${fileName || 'upload.png'}`.replace(/[^a-zA-Z0-9.\-]/g, '');
        
        const { data, error } = await supabase.storage
            .from('nd-shop-media')
            .upload(uniqueFileName, buffer, {
                contentType: finalMimeType,
                upsert: true
            });

        if (error) {
            console.error('Upload error:', error);
            return res.status(500).json({ success: false, error: 'Failed to upload to storage' });
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('nd-shop-media')
            .getPublicUrl(uniqueFileName);

        res.json({ 
            success: true, 
            url: publicUrlData.publicUrl 
        });

    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});



// ========================================
// PUBLIC-READY ITEM SYNC API
// ========================================

app.post('/api/sync-items', authenticateToken, async (req, res) => {
    try {
        // Expected payload: { table: 'products', operations: [ { type: 'INSERT', data: {} }, { type: 'UPDATE', data: {} }, { type: 'DELETE', id: 'uuid' } ] }
        const { table, operations } = req.body;
        
        const allowedTables = ['products', 'community_messages'];
        const jsonbTables = ['requests', 'messages', 'sales_history', 'debtor_notes', 'debt_requests', 'expenses_notebook', 'income_allocations', 'ai_chat_history'];
        const settingsTables = ['admin_settings'];
        
        if (![...allowedTables, ...jsonbTables, ...settingsTables].includes(table)) {
            return res.status(400).json({ success: false, error: 'Invalid table' });
        }

        for (const op of operations) {
            if (op.type === 'INSERT' || op.type === 'UPDATE') {
                let upsertPayload = op.data;
                if (jsonbTables.includes(table)) {
                    upsertPayload = { id: op.data.id, data: op.data };
                    // Add columns for privacy filtering
                    if (table === 'requests') {
                        upsertPayload.user_id = op.data.user ? op.data.user.id : (op.data.userId || '');
                    } else if (table === 'messages') {
                        upsertPayload.sender_id = op.data.senderId || '';
                        upsertPayload.receiver_id = op.data.receiverId || '';
                    }
                }

                const { error } = await supabase
                    .from(table)
                    .upsert(upsertPayload);
                if (error) console.error(`Error upserting ${table}:`, error);
            } else if (op.type === 'DELETE') {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .eq('id', op.id);
                if (error) console.error(`Error deleting ${table}:`, error);
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Sync Items Error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.get('/api/get-table/:table', optionalToken, async (req, res) => {
    try {
        const { table } = req.params;
        const userId = req.user ? req.user.id : null;

        const allowedTables = ['products', 'community_messages'];
        const jsonbTables = ['requests', 'messages', 'sales_history', 'debtor_notes', 'debt_requests', 'expenses_notebook', 'income_allocations', 'ai_chat_history'];
        const settingsTables = ['admin_settings'];

        if (![...allowedTables, ...jsonbTables, ...settingsTables].includes(table)) {
            return res.status(400).json({ success: false, error: 'Invalid table' });
        }

        let query = supabase.from(table).select('*');

        // Privacy Filtering logic
        if (table === 'requests' || table === 'messages') {
            if (!userId) {
                // If no userId is provided, return empty array (unauthenticated)
                return res.json({ success: true, data: [] });
            }

            // Check if user is admin
            const isAdmin = req.user && req.user.is_admin;

            if (!isAdmin) {
                // If not admin, only fetch their own records using actual Supabase column names
                if (table === 'requests') {
                    query = query.eq('user_id', userId);
                } else if (table === 'messages') {
                    query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
                }
            }
        }

        const { data, error } = await query;

        if (error) throw error;
        
        let mappedData = data;
        if (jsonbTables.includes(table)) {
            mappedData = data.map(row => row.data);
        }

        res.json({ success: true, data: mappedData });
    } catch (err) {
        console.error('Get Table Error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
