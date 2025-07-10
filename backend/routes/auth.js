const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();

// In backend/routes/auth.js

router.post('/register', async (req, res) => {
  const { username, password, is_admin = false } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3)', [
      username,
      hash,
      is_admin,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error('Registration failed:', err.message);
    res.status(400).json({ success: false, error: 'Username already exists or invalid input' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'User not found' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Wrong password' });

  const token = jwt.sign(
    { id: user.id, username: user.username, is_admin: user.is_admin },
    process.env.JWT_SECRET
  );
  res.json({ token });
});

module.exports = router;
