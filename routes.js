const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query, isPostgres } = require('./database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Middleware to verify Admin Token
const authenticateAdmin = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        if (!verified.is_admin) return res.status(403).json({ error: 'Admin access required' });
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid Token' });
    }
};

// POST /api/apply - Submit a new application
router.post('/apply', async (req, res) => {
    const { name, email, phone, destination, position } = req.body;
    try {
        let result;
        if (isPostgres) {
            // Postgres: uses RETURNING to get ID
            const sql = 'INSERT INTO applications (name, email, phone, destination, position) VALUES ($1, $2, $3, $4, $5) RETURNING id';
            result = await query(sql, [name, email, phone, destination, position]);
            const newId = result.rows[0].id;
            res.status(201).json({ message: 'Application submitted successfully', id: newId });
        } else {
            // SQLite: uses lastID from wrapper
            const sql = 'INSERT INTO applications (name, email, phone, destination, position) VALUES ($1, $2, $3, $4, $5)';
            result = await query(sql, [name, email, phone, destination, position]);
            res.status(201).json({ message: 'Application submitted successfully', id: result.lastID });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// POST /api/login - Admin Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const sql = 'SELECT * FROM users WHERE username = $1';
        const result = await query(sql, [username]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: 'Invalid password' });

        // Create Token
        const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '1h' });
        res.header('Authorization', token).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/applications - Get all applications (Admin only)
router.get('/applications', authenticateAdmin, async (req, res) => {
    try {
        const sql = 'SELECT * FROM applications ORDER BY created_at DESC';
        const result = await query(sql);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

module.exports = router;
