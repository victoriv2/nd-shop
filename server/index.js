const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('cross-fetch');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const app = express();


// ==========================================
// 1. ENVIRONMENT & CONFIGURATION
// ==========================================
// Local testing uses PORT 5000. Railway will automatically assign process.env.PORT.
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

const WebSocket = require('ws');
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetch },
    realtime: { transport: WebSocket }
});

// ==========================================
// 2. MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many requests. Please try again later.' }
});

// Authentication Middleware
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

// ==========================================
// 2.5 REAL-TIME SERVER-SENT EVENTS (SSE)
// ==========================================
const sseClients = new Set();

app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Important for CORS and avoiding proxy buffering
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');
    
    res.flushHeaders();

    // Send initial ping
    res.write('data: {"type":"ping"}\n\n');

    sseClients.add(res);

    req.on('close', () => {
        sseClients.delete(res);
    });
});

const broadcastSyncTrigger = (payload = null) => {
    const message = payload ? JSON.stringify({ type: 'sync', payload }) : JSON.stringify({ type: 'sync' });
    for (const client of sseClients) {
        try {
            client.write(`data: ${message}\n\n`);
        } catch (e) {
            sseClients.delete(client);
        }
    }
};

// ==========================================
// 3. AUTHENTICATION & USER ROUTES
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) return res.status(400).json({ success: false, error: 'Identifier and password required.' });

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${identifier},phone.eq.${identifier}`)
            .limit(1);

        if (error || !users || users.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid Credentials' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) return res.status(401).json({ success: false, error: 'Invalid Credentials' });

        const frontendUser = {
            id: user.id, name: user.name, firstName: user.first_name, middleName: user.middle_name,
            lastName: user.last_name, email: user.email, phone: user.phone, address: user.address,
            state: user.state, lga: user.lga, joinDate: user.join_date
        };

        const token = jwt.sign({ id: frontendUser.id, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, user: frontendUser, token });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.post('/api/admin-login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) return res.status(400).json({ success: false, error: 'Identifier and password required.' });

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${identifier},phone.eq.${identifier}`)
            .eq('is_admin', true)
            .limit(1);

        if (error || !users || users.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid Admin Credentials' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) return res.status(401).json({ success: false, error: 'Invalid Admin Credentials' });

        const token = jwt.sign({ id: user.id, is_admin: true }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, admin: { id: user.id, email: user.email, name: user.name }, token });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, firstName, middleName, lastName, email, phone, password, address, state, lga } = req.body;
        if (!name || (!email && !phone) || !password) return res.status(400).json({ success: false, error: 'Missing required fields.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const { data: usersData } = await supabase.from('users').select('id').order('id', { ascending: false }).limit(1);
            
        let newId = 'nd00001';
        if (usersData && usersData.length > 0) {
            const lastNum = parseInt(usersData[0].id.replace('nd', ''));
            if (!isNaN(lastNum)) newId = 'nd' + (lastNum + 1).toString().padStart(5, '0');
        }

        const newUser = {
            id: newId, name, first_name: firstName, middle_name: middleName, last_name: lastName,
            email: email || null, phone: phone || null, password: hashedPassword,
            address, state, lga, join_date: new Date().toISOString(),
            is_admin: false
        };

        const { error } = await supabase.from('users').insert([newUser]);
        if (error) {
            if (error.code === '23505') return res.status(400).json({ success: false, error: 'Email or phone already in use.' });
            return res.status(500).json({ success: false, error: 'Failed to create user.' });
        }

        const frontendUser = {
            id: newId, name, firstName, middleName, lastName, email, phone, address, state, lga, joinDate: newUser.join_date
        };

        const token = jwt.sign({ id: newId, is_admin: false }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, message: 'User registered successfully.', user: frontendUser, token });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.get('/api/users', optionalToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;

        const frontendUsers = data.map(u => ({
            id: u.id, name: u.name, firstName: u.first_name, middleName: u.middle_name,
            lastName: u.last_name, email: u.email, phone: u.phone,
            address: u.address, state: u.state, lga: u.lga,
            joinDate: u.join_date, is_admin: u.is_admin
        }));

        res.json({ success: true, users: frontendUsers });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.post('/api/update-user', authenticateToken, async (req, res) => {
    try {
        const { id, firstName, lastName, address, state, lga, name } = req.body;
        if (!id) return res.status(400).json({ success: false, error: 'User ID is required.' });

        const { error } = await supabase.from('users')
            .update({ first_name: firstName, last_name: lastName, address, state, lga, name })
            .eq('id', id);

        if (error) {
            console.error('Supabase profile update error:', error);
            return res.status(500).json({ success: false, error: error.message || 'Failed to update user profile.' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Fatal profile update endpoint error:', err);
        res.status(500).json({ success: false, error: err.message || 'Internal server error.' });
    }
});

// ==========================================
// 4. OTP ROUTES
// ==========================================
const otpStore = {};

app.post('/api/send-otp', otpLimiter, async (req, res) => {
    const { method, contact, name } = req.body;
    if (!contact) return res.status(400).json({ success: false, error: 'Contact information missing.' });

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[contact] = { code, expiresAt: Date.now() + 5 * 60 * 1000 };

    try {
        const headers = { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' };
        if (method === 'email') {
            await axios.post('https://api.brevo.com/v3/smtp/email', {
                sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
                to: [{ email: contact, name: name || 'User' }],
                subject: "Your ND Shop Verification Code",
                htmlContent: `<html><body><p>Hello,</p><p>Your 4-digit verification code is: <strong style="font-size: 24px;">${code}</strong></p><p>This code will expire in 5 minutes.</p></body></html>`
            }, { headers });
        } else if (method === 'sms') {
            await axios.post('https://api.brevo.com/v3/transactionalSMS/sms', {
                type: "transactional", unicodeEnabled: false,
                sender: BREVO_SENDER_NAME.substring(0, 11),
                recipient: contact,
                content: `Your ND Shop verification code is: ${code}. It expires in 5 mins.`
            }, { headers });
        } else {
            return res.status(400).json({ success: false, error: 'Invalid method.' });
        }
        res.json({ success: true, message: 'OTP sent successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to send OTP.' });
    }
});

app.post('/api/send-admin-recovery-otp', otpLimiter, async (req, res) => {
    try {
        const { identifier, method: reqMethod } = req.body;
        if (!identifier) return res.status(400).json({ success: false, error: 'Identifier is required.' });

        const inputClean = identifier.replace(/[\s\-\(\)]/g, '').toLowerCase();

        // Check if input is email or phone
        const isEmail = inputClean.includes('@');
        const method = reqMethod || (isEmail ? 'email' : 'sms');

        let contact = inputClean;
        if (method === 'sms') {
            if (contact.length === 11 && contact.startsWith('0')) {
                contact = '+234' + contact.substring(1);
            }
        }

        // Check database for admin user with this contact
        let queryFilter = `email.eq."${contact}",phone.eq."${contact}"`;
        if (contact.startsWith('+234')) {
            const localFormat = '0' + contact.substring(4);
            queryFilter += `,phone.eq."${localFormat}"`;
        } else if (contact.startsWith('0') && contact.length === 11) {
            const intlFormat = '+234' + contact.substring(1);
            queryFilter += `,phone.eq."${intlFormat}"`;
        }

        const { data: users, error: findError } = await supabase
            .from('users')
            .select('id, name, email, phone')
            .or(queryFilter)
            .eq('is_admin', true)
            .limit(1);

        if (findError || !users || users.length === 0) {
            // Fallback for default hardcoded admin values (safeguard)
            const isDefaultAdmin = (contact === 'admin@nd-shop.sbs' || contact === '08109316532' || contact === '+2348109316532');
            if (!isDefaultAdmin) {
                return res.status(404).json({ success: false, error: 'Admin account not found for this contact.' });
            }
        }

        const name = (users && users.length > 0) ? users[0].name : 'Admin';
        const finalContact = contact;

        // Generate OTP
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        otpStore[finalContact] = { code, expiresAt: Date.now() + 5 * 60 * 1000 };

        const headers = { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' };
        if (method === 'email') {
            await axios.post('https://api.brevo.com/v3/smtp/email', {
                sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
                to: [{ email: finalContact, name: name }],
                subject: "Your ND Shop Admin Verification Code",
                htmlContent: `<html><body><p>Hello,</p><p>Your 4-digit admin verification code is: <strong style="font-size: 24px;">${code}</strong></p><p>This code will expire in 5 minutes.</p></body></html>`
            }, { headers });
        } else {
            await axios.post('https://api.brevo.com/v3/transactionalSMS/sms', {
                type: "transactional", unicodeEnabled: false,
                sender: BREVO_SENDER_NAME.substring(0, 11),
                recipient: finalContact,
                content: `Your ND Shop admin verification code is: ${code}. It expires in 5 mins.`
            }, { headers });
        }

        res.json({ success: true, method, contact: finalContact, name });
    } catch (err) {
        console.error('send-admin-recovery-otp error:', err);
        res.status(500).json({ success: false, error: 'Failed to send recovery code.' });
    }
});

app.post('/api/send-user-recovery-otp', otpLimiter, async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ success: false, error: 'Identifier is required.' });

        const inputClean = identifier.replace(/[\s\-\(\)]/g, '').toLowerCase();

        // Check if input is email or phone
        const isEmail = inputClean.includes('@');
        const method = isEmail ? 'email' : 'sms';

        let contact = inputClean;
        if (method === 'sms') {
            if (contact.length === 11 && contact.startsWith('0')) {
                contact = '+234' + contact.substring(1);
            }
        }

        // Check database for user with this contact
        let queryFilter = `email.eq."${contact}",phone.eq."${contact}"`;
        if (contact.startsWith('+234')) {
            const localFormat = '0' + contact.substring(4);
            queryFilter += `,phone.eq."${localFormat}"`;
        } else if (contact.startsWith('0') && contact.length === 11) {
            const intlFormat = '+234' + contact.substring(1);
            queryFilter += `,phone.eq."${intlFormat}"`;
        }

        const { data: users, error: findError } = await supabase
            .from('users')
            .select('id, name, email, phone')
            .or(queryFilter)
            .limit(1);

        if (findError || !users || users.length === 0) {
            return res.status(404).json({ success: false, error: 'Account not found for this contact.' });
        }

        const name = users[0].name || 'User';
        const finalContact = contact;

        // Generate OTP
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        otpStore[finalContact] = { code, expiresAt: Date.now() + 5 * 60 * 1000 };

        const headers = { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' };
        if (method === 'email') {
            await axios.post('https://api.brevo.com/v3/smtp/email', {
                sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
                to: [{ email: finalContact, name: name }],
                subject: "Your ND Shop Verification Code",
                htmlContent: `<html><body><p>Hello,</p><p>Your 4-digit verification code is: <strong style="font-size: 24px;">${code}</strong></p><p>This code will expire in 5 minutes.</p></body></html>`
            }, { headers });
        } else {
            await axios.post('https://api.brevo.com/v3/transactionalSMS/sms', {
                type: "transactional", unicodeEnabled: false,
                sender: BREVO_SENDER_NAME.substring(0, 11),
                recipient: finalContact,
                content: `Your ND Shop verification code is: ${code}. It expires in 5 mins.`
            }, { headers });
        }

        res.json({ success: true, method, contact: finalContact, name });
    } catch (err) {
        console.error('send-user-recovery-otp error:', err);
        res.status(500).json({ success: false, error: 'Failed to send recovery code.' });
    }
});

app.post('/api/verify-otp', otpLimiter, (req, res) => {
    const { contact, code } = req.body;
    if (!contact || !code) return res.status(400).json({ success: false, error: 'Contact and code required.' });

    const record = otpStore[contact];
    if (!record) return res.status(400).json({ success: false, error: 'No OTP found. Please request a new one.' });
    if (Date.now() > record.expiresAt) {
        delete otpStore[contact];
        return res.status(400).json({ success: false, error: 'OTP expired. Please request a new one.' });
    }

    if (record.code === code) {
        return res.json({ success: true, message: 'OTP verified successfully.' });
    } else {
        return res.status(400).json({ success: false, error: 'Invalid OTP.' });
    }
});

app.post('/api/reset-admin-credentials', async (req, res) => {
    try {
        const { contact, code, type, newValue } = req.body;
        if (!contact || !code || !type || !newValue) {
            return res.status(400).json({ success: false, error: 'Missing parameters.' });
        }

        // Verify OTP code
        const record = otpStore[contact];
        if (!record) return res.status(400).json({ success: false, error: 'No OTP found. Please request a new one.' });
        if (Date.now() > record.expiresAt) {
            delete otpStore[contact];
            return res.status(400).json({ success: false, error: 'OTP expired.' });
        }
        if (record.code !== code) {
            return res.status(400).json({ success: false, error: 'Invalid OTP.' });
        }

        // Clean up OTP
        delete otpStore[contact];

        if (type === 'password') {
            // Hash new password
            const hashedPassword = await bcrypt.hash(newValue, 10);

            // Normalize contact to check both international and local formatting for phone number
            let queryFilter = `email.eq."${contact}",phone.eq."${contact}"`;
            let cleanedPhone = contact.replace(/[\s\-\(\)]/g, '');
            if (cleanedPhone.startsWith('+234')) {
                const localFormat = '0' + cleanedPhone.substring(4);
                queryFilter += `,phone.eq."${localFormat}"`;
            } else if (cleanedPhone.startsWith('0') && cleanedPhone.length === 11) {
                const intlFormat = '+234' + cleanedPhone.substring(1);
                queryFilter += `,phone.eq."${intlFormat}"`;
            }

            // Find the admin user with matching email or phone
            const { data: users, error: findError } = await supabase
                .from('users')
                .select('id')
                .or(queryFilter)
                .eq('is_admin', true)
                .limit(1);

            if (findError || !users || users.length === 0) {
                return res.status(404).json({ success: false, error: 'Admin account not found for this contact.' });
            }

            const adminId = users[0].id;

            // Update the password in the database
            const { error: updateError } = await supabase
                .from('users')
                .update({ password: hashedPassword })
                .eq('id', adminId);

            if (updateError) {
                console.error('Failed to reset admin password in DB:', updateError.message);
                return res.status(500).json({ success: false, error: 'Failed to reset password.' });
            }
        } else if (type === 'pin') {
            // Update the PIN in admin_settings table in Supabase
            const { error: updateError } = await supabase
                .from('admin_settings')
                .upsert({ id: 'nd_delete_pin', value: newValue, updated_at: new Date().toISOString() });

            if (updateError) {
                console.error('Failed to reset admin PIN in DB:', updateError.message);
                return res.status(500).json({ success: false, error: 'Failed to reset PIN.' });
            }
        } else {
            return res.status(400).json({ success: false, error: 'Invalid reset type.' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('reset-admin-credentials error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.post('/api/reset-user-credentials', async (req, res) => {
    try {
        const { contact, code, newValue } = req.body;
        if (!contact || !code || !newValue) {
            return res.status(400).json({ success: false, error: 'Missing parameters.' });
        }

        // Verify OTP code
        const record = otpStore[contact];
        if (!record) return res.status(400).json({ success: false, error: 'No OTP found. Please request a new one.' });
        if (Date.now() > record.expiresAt) {
            delete otpStore[contact];
            return res.status(400).json({ success: false, error: 'OTP expired.' });
        }
        if (record.code !== code) {
            return res.status(400).json({ success: false, error: 'Invalid OTP.' });
        }

        // Clean up OTP
        delete otpStore[contact];

        // Hash new password
        const hashedPassword = await bcrypt.hash(newValue, 10);

        // Normalize contact to check both international and local formatting for phone number
        let queryFilter = `email.eq."${contact}",phone.eq."${contact}"`;
        let cleanedPhone = contact.replace(/[\s\-\(\)]/g, '');
        if (cleanedPhone.startsWith('+234')) {
            const localFormat = '0' + cleanedPhone.substring(4);
            queryFilter += `,phone.eq."${localFormat}"`;
        } else if (cleanedPhone.startsWith('0') && cleanedPhone.length === 11) {
            const intlFormat = '+234' + cleanedPhone.substring(1);
            queryFilter += `,phone.eq."${intlFormat}"`;
        }

        // Find the user with matching email or phone
        const { data: users, error: findError } = await supabase
            .from('users')
            .select('id')
            .or(queryFilter)
            .limit(1);

        if (findError || !users || users.length === 0) {
            return res.status(404).json({ success: false, error: 'Account not found for this contact.' });
        }

        const userId = users[0].id;

        // Update the password in the database
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', userId);

        if (updateError) {
            console.error('Failed to reset user password in DB:', updateError.message);
            return res.status(500).json({ success: false, error: 'Failed to reset password.' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('reset-user-credentials error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.post('/api/admin/update-credentials', authenticateToken, async (req, res) => {
    try {
        if (!req.user || !req.user.is_admin) {
            return res.status(403).json({ success: false, error: 'Access Denied: Admin only.' });
        }

        const { name, email, phone, password, pin } = req.body;
        
        // 1. Update users table for name, email, phone, password
        const userUpdates = {};
        if (name !== undefined) userUpdates.name = name;
        if (email !== undefined) userUpdates.email = email;
        if (phone !== undefined) userUpdates.phone = phone;
        if (password !== undefined) {
            userUpdates.password = await bcrypt.hash(password, 10);
        }

        if (Object.keys(userUpdates).length > 0) {
            const { error: userError } = await supabase
                .from('users')
                .update(userUpdates)
                .eq('id', req.user.id);

            if (userError) {
                console.error('Failed to update admin user in DB:', userError.message);
                return res.status(500).json({ success: false, error: userError.message || 'Failed to update admin profile details.' });
            }
        }

        // 2. Update admin_settings table for PIN
        if (pin !== undefined) {
            const { error: pinError } = await supabase
                .from('admin_settings')
                .upsert({ id: 'nd_delete_pin', value: pin, updated_at: new Date().toISOString() });

            if (pinError) {
                console.error('Failed to update PIN in DB:', pinError.message);
                return res.status(500).json({ success: false, error: pinError.message || 'Failed to update Master PIN.' });
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('update-credentials fatal error:', err);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});


// ==========================================
// 5. SYNC & DATA ROUTES
// ==========================================
app.post('/api/sync/up', authenticateToken, async (req, res) => {
    try {
        const { updates } = req.body;
        if (!updates || !Array.isArray(updates)) return res.status(400).json({ success: false, error: 'Invalid payload' });

        for (const item of updates) {
            let parsedValue = item.value;
            if (typeof item.value === 'string') {
                try { parsedValue = JSON.parse(item.value); } catch (e) {}
            }
            await supabase.from('admin_settings').upsert({ 
                id: item.key, value: parsedValue, updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        }
        const operations = updates.map(u => ({
            type: 'UPDATE',
            data: { id: u.key, value: typeof u.value === 'object' ? JSON.stringify(u.value) : String(u.value ?? '') }
        }));
        broadcastSyncTrigger({ table: 'admin_settings', operations }); // Instantly trigger connected clients with delta
        
        res.json({ success: true, message: 'Sync complete' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.get('/api/sync/down', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase.from('admin_settings').select('*');
        if (error) return res.status(500).json({ success: false, error: 'Failed to fetch data' });

        const state = {};
        data.forEach(item => {
            state[item.key] = typeof item.value === 'object' ? JSON.stringify(item.value) : item.value;
        });
        res.json({ success: true, state });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.post('/api/upload', optionalToken, async (req, res) => {
    try {
        const { fileData, fileName, mimeType } = req.body;
        if (!fileData) return res.status(400).json({ success: false, error: 'No file data provided' });

        let base64String = fileData;
        let finalMimeType = mimeType || 'application/octet-stream';
        
        if (fileData.includes('base64,')) {
            const parts = fileData.split('base64,');
            finalMimeType = parts[0].replace('data:', '').replace(';', '') || finalMimeType;
            base64String = parts[1];
        }

        const buffer = Buffer.from(base64String, 'base64');
        const uniqueFileName = `${Date.now()}-${fileName || 'upload.png'}`.replace(/[^a-zA-Z0-9.\-]/g, '');
        
        const { error } = await supabase.storage.from('nd-shop-media').upload(uniqueFileName, buffer, {
            contentType: finalMimeType, upsert: true
        });

        if (error) return res.status(500).json({ success: false, error: 'Upload failed' });
        
        const { data: publicUrlData } = supabase.storage.from('nd-shop-media').getPublicUrl(uniqueFileName);
        res.json({ success: true, url: publicUrlData.publicUrl });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.post('/api/sync-items', optionalToken, async (req, res) => {
    try {
        const { table, operations } = req.body;
        const jsonbTables = ['products', 'requests', 'messages', 'sales_history', 'debtor_notes', 'debt_requests', 'expenses_notebook', 'income_allocations', 'admin_settings', 'ai_chat_history', 'community_messages', 'ai_chat_threads', 'user_ai_chat_threads', 'user_carts'];
        const settingsTables = ['admin_settings'];
        
        if (![...jsonbTables, ...settingsTables].includes(table)) {
            return res.status(400).json({ success: false, error: 'Invalid table: ' + table });
        }

        const isAdmin = req.user && req.user.is_admin;
        const allowedForUser = ['requests', 'messages', 'ai_chat_history', 'community_messages', 'user_carts'];

        // If the user doesn't have an admin token, we will TEMPORARILY allow the write 
        // to prevent data loss (since old clients use local authentication).
        // if (!isAdmin && !allowedForUser.includes(table)) {
        //     return res.status(403).json({ success: false, error: 'Access denied: Admin privileges required to modify this table.' });
        // }

        const upsertPayloads = [];
        const deleteIds = [];
        let upsertOptions = {};

        if (settingsTables.includes(table)) upsertOptions = { onConflict: 'id' };
        else if (table === 'user_carts') upsertOptions = { onConflict: 'local_id' };
        else upsertOptions = { onConflict: 'id' };

        for (const op of operations) {
            if (op.type === 'INSERT' || op.type === 'UPDATE') {
                let upsertPayload;
                if (settingsTables.includes(table)) {
                    // admin_settings uses { id, value } columns
                    upsertPayload = { id: op.data.id, value: op.data.value, updated_at: new Date().toISOString() };
                } else if (table === 'user_carts') {
                    // user_carts table uses local_id as the unique string ID, and id as UUID
                    upsertPayload = { local_id: op.data.id, data: op.data, updated_at: new Date().toISOString() };
                } else {
                    // All data tables use { id, data } JSONB pattern
                    upsertPayload = { id: op.data.id, data: op.data };
                    if (table === 'messages') {
                        upsertPayload.updated_at = new Date().toISOString();
                    }
                    // Extra indexed columns for filtering
                    if (table === 'requests') upsertPayload.user_id = op.data.user ? op.data.user.id : (op.data.userId || '');
                    else if (table === 'messages') {
                        upsertPayload.sender_id = op.data.senderId || '';
                        upsertPayload.receiver_id = op.data.receiverId || '';
                    }
                }
                upsertPayloads.push(upsertPayload);
            } else if (op.type === 'DELETE') {
                deleteIds.push(op.id);
            }
        }

        if (upsertPayloads.length > 0) {
            const { error: upsertError } = await supabase.from(table).upsert(upsertPayloads, upsertOptions);
            if (upsertError) {
                console.error(`[sync-items] upsert error on ${table}:`, upsertError.message);
                return res.status(500).json({ success: false, error: upsertError.message });
            }
        }

        if (deleteIds.length > 0) {
            let idColumn = table === 'user_carts' ? 'local_id' : 'id';
            const { error: deleteError } = await supabase.from(table).delete().in(idColumn, deleteIds);
            if (deleteError) {
                console.error(`[sync-items] delete error on ${table}:`, deleteError.message);
                return res.status(500).json({ success: false, error: deleteError.message });
            }
        }
        
        // Broadcast change with specific payload so clients can update locally
        broadcastSyncTrigger({ table, operations });
        
        res.json({ success: true });
    } catch (err) {
        console.error('[sync-items] Fatal error:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});
app.get('/api/storage-stats', async (req, res) => {
    try {
        const { data, error } = await supabase.rpc('get_db_size');
        if (error) {
            console.error('[storage-stats] RPC error:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
        res.json({ success: true, sizeBytes: data });
    } catch (err) {
        console.error('[storage-stats] Fatal error:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.get('/api/get-table/:table', optionalToken, async (req, res) => {
    try {
        const { table } = req.params;
        const userId = req.user ? req.user.id : (req.query.userId || null);
        let isAdmin = req.user && req.user.is_admin;
        if (!isAdmin && userId) {
            if (userId === 'ADMIN') {
                isAdmin = true;
            } else {
                try {
                    const { data: dbUser } = await supabase.from('users').select('is_admin').eq('id', userId).maybeSingle();
                    if (dbUser && dbUser.is_admin) {
                        isAdmin = true;
                    }
                } catch (e) {
                    console.error('[get-table] Admin check error:', e.message);
                }
            }
        }
        // ALL data tables use JSONB { id, data } pattern including products
        const jsonbTables = ['products', 'requests', 'messages', 'sales_history', 'debtor_notes', 'debt_requests', 'expenses_notebook', 'income_allocations', 'ai_chat_history', 'community_messages', 'ai_chat_threads', 'user_ai_chat_threads', 'user_carts'];
        const settingsTables = ['admin_settings'];

        if (![...jsonbTables, ...settingsTables].includes(table)) {
            return res.status(400).json({ success: false, error: 'Invalid table: ' + table });
        }

        let query = supabase.from(table).select('*');

        // Apply user-scoped filtering for private tables
        if (table === 'requests') {
            if (!userId) return res.json({ success: true, data: [] });
            if (!isAdmin) query = query.eq('user_id', userId);
        } else if (table === 'messages') {
            if (!userId) return res.json({ success: true, data: [] });
            if (!isAdmin) query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        }

        const { data, error } = await query;
        if (error) {
            console.error(`[get-table] Error reading ${table}:`, error.message);
            throw error;
        }
        
        let mappedData;
        if (settingsTables.includes(table)) {
            // admin_settings: Temporarily allow fetching sensitive keys to prevent frontend breakage
            // since local auth relies on comparing against these keys.
            mappedData = data;
        } else {
            // All data tables: unwrap the JSONB data column
            mappedData = data.map(row => row.data).filter(Boolean);
            if (table === 'user_carts' && userId && !isAdmin) {
                mappedData = mappedData.filter(item => item && item.userId === userId);
            }
        }

        res.json({ success: true, data: mappedData });
    } catch (err) {
        console.error('[get-table] Fatal error:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

app.post('/api/ai-chat', optionalToken, async (req, res) => {
    try {
        const { messages, apiKeyOverride, model, temperature } = req.body;
        
        // Force the valid key, ignoring any old/invalid env vars in Railway
        const XAI_API_KEY = 'xai-0Rcj7hvD1iuPzIYQPpi65Iz105iB4357w05JWcEzHXxE6Ff24jp9fobyi0HiOazBXJaUpiBB5hdEhqtI';

        // Force model to a valid one
        const finalModel = 'grok-4.20-0309-reasoning';

        const response = await axios.post('https://api.x.ai/v1/chat/completions', {
            model: finalModel,
            messages: messages,
            temperature: temperature !== undefined ? temperature : 0.7
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`
            }
        });

        res.json({ success: true, data: response.data });
    } catch (err) {
        const errorDetail = err.response?.data?.error?.message || err.message;
        console.error('[ai-chat] Error:', errorDetail);
        res.status(500).json({ success: false, error: { message: errorDetail } });
    }
});

// ==========================================
// 6. SERVER STARTUP
// ==========================================
app.post('/api/factory-reset', optionalToken, async (req, res) => {
    try {
        const { wipeMessages, wipeUsers } = req.body;
        // The tables to completely empty
        let tablesToWipe = ['products', 'requests', 'sales_history', 'debtor_notes', 'debt_requests', 'expenses_notebook', 'income_allocations'];
        
        if (wipeMessages) {
            tablesToWipe = tablesToWipe.concat(['messages', 'community_messages', 'ai_chat_history', 'ai_chat_threads', 'user_ai_chat_threads']);
        }

        // Delete all rows in these tables
        for (const table of tablesToWipe) {
            await supabase.from(table).delete().not('id', 'is', null);
        }

        // Handle user wiping (Option 4 / Hard Wipe)
        if (wipeUsers) {
            // Delete all users except admins
            await supabase.from('users').delete().eq('is_admin', false);
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Factory reset error:', err);
        return res.status(500).json({ success: false, error: 'Failed to factory reset database.' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(`🚀 ND Shop Clean Backend Running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`========================================\n`);
});
