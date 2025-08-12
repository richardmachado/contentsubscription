const express = require('express');
const router = express.Router();
const pool = require('../db');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const result = await pool.query('SELECT name, phone, email FROM users WHERE id = $1', [
    req.user.id,
  ]);
  res.json(result.rows[0] || {});
});

router.post('/', auth, async (req, res) => {
  const { name, phone, email } = req.body;
  const digitsOnly = phone.replace(/\D/g, '');
  if (!/^\d{10}$/.test(digitsOnly)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }
  await pool.query('UPDATE users SET name = $1, phone = $2, email = $3 WHERE id = $4', [
    name,
    phone,
    email,
    req.user.id,
  ]);
  res.json({ success: true });
});

module.exports = router;
