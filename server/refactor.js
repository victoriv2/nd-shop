const fs = require('fs');

let code = fs.readFileSync('index.js', 'utf8');

// 1. Imports
code = code.replace(
    "const bcrypt = require('bcrypt');",
    `const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

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
};`
);

// 2. Rate limiter
code = code.replace(
    "app.post('/api/send-otp', async (req, res) => {",
    "app.post('/api/send-otp', otpLimiter, async (req, res) => {"
);
code = code.replace(
    "app.post('/api/verify-otp', (req, res) => {",
    "app.post('/api/verify-otp', otpLimiter, (req, res) => {"
);

// 3. Register token
code = code.replace(
    "res.json({ success: true, message: 'User registered successfully.', user: frontendUser });",
    `const token = jwt.sign({ id: frontendUser.id, is_admin: false }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, message: 'User registered successfully.', user: frontendUser, token });`
);

// 4. Login token
code = code.replace(
    "res.json({ success: true, user: frontendUser });",
    `const token = jwt.sign({ id: frontendUser.id, is_admin: safeUser.is_admin }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, user: frontendUser, token });`
);

// 5. Admin login token
code = code.replace(
    "res.json({ success: true, admin: { id: user.id, email: user.email, name: user.name } });",
    `const token = jwt.sign({ id: user.id, is_admin: true }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, admin: { id: user.id, email: user.email, name: user.name }, token });`
);

// 6. Protect routes
code = code.replace(
    "app.post('/api/update-user', async (req, res) => {",
    "app.post('/api/update-user', authenticateToken, async (req, res) => {"
);
code = code.replace(
    "app.get('/api/users', async (req, res) => {",
    "app.get('/api/users', authenticateToken, async (req, res) => {"
);
code = code.replace(
    "app.post('/api/sync/up', async (req, res) => {",
    "app.post('/api/sync/up', authenticateToken, async (req, res) => {"
);
code = code.replace(
    "app.get('/api/sync/down', async (req, res) => {",
    "app.get('/api/sync/down', authenticateToken, async (req, res) => {"
);
code = code.replace(
    "app.post('/api/upload', async (req, res) => {",
    "app.post('/api/upload', authenticateToken, async (req, res) => {"
);
code = code.replace(
    "app.post('/api/sync-items', async (req, res) => {",
    "app.post('/api/sync-items', authenticateToken, async (req, res) => {"
);

// 7. Get-table uses optionalToken
code = code.replace(
    "app.get('/api/get-table/:table', async (req, res) => {",
    "app.get('/api/get-table/:table', optionalToken, async (req, res) => {"
);

// 8. Modify Get-table to use req.user.id instead of req.query.userId
code = code.replace(
    "const { userId } = req.query; // Pass userId from frontend",
    "const userId = req.user ? req.user.id : null;"
);
code = code.replace(
    "const { data: userData } = await supabase.from('users').select('is_admin').eq('id', userId).single();\r\n            const isAdmin = userData && userData.is_admin;",
    "const isAdmin = req.user && req.user.is_admin;"
);
// In case it's \n instead of \r\n
code = code.replace(
    "const { data: userData } = await supabase.from('users').select('is_admin').eq('id', userId).single();\n            const isAdmin = userData && userData.is_admin;",
    "const isAdmin = req.user && req.user.is_admin;"
);

fs.writeFileSync('index.js', code);
console.log('Refactor successful');
