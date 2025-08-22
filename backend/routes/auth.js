// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const JWT_TTL = process.env.JWT_TTL || '1h';

// Basic input checks (keep lightweight; swap for joi/zod if you like)
function isValidUsername(u) {
  return typeof u === 'string' && u.trim().length >= 3 && u.trim().length <= 32;
}
function isValidPassword(p) {
  return typeof p === 'string' && p.length >= 8;
}

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET is not set. Set it in your environment!');
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!isValidUsername(username) || !isValidPassword(password)) {
      return res.status(400).json({ success: false, error: 'Invalid username or password format' });
    }

    // normalize (drop this if you want case-sensitive usernames)
    const normalized = username.trim().toLowerCase();

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Force is_admin to false at creation time
    const insertSql = `
      INSERT INTO users (username, password, is_admin)
      VALUES ($1, $2, false)
      RETURNING id, username, is_admin
    `;
    const result = await pool.query(insertSql, [normalized, hash]);
    const created = result.rows[0];

    return res.status(201).json({ success: true, user: created });
  } catch (err) {
    // Handle unique constraint violation from Postgres
    if (err && err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Username already exists' });
    }
    console.error('Registration failed:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!isValidUsername(username) || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const normalized = username.trim().toLowerCase();

    const result = await pool.query(
      'SELECT id, username, password, is_admin FROM users WHERE username = $1',
      [normalized]
    );
    const user = result.rows[0];

    // Use a single message to avoid user enumeration
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = { id: user.id, username: user.username, is_admin: user.is_admin };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: JWT_TTL /*, issuer: 'your-app', audience: 'your-spa' */,
    });

    return res.json({
      token,
      user: { id: user.id, username: user.username, is_admin: user.is_admin },
      expires_in: JWT_TTL,
    });
  } catch (err) {
    console.error('Login failed:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
