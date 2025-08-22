// backend/routes/profile.js
const express = require('express');
const router = express.Router();

// Handle both export styles for db: module.exports = pool OR { pool }
const dbExport = require('../db');
const pool = dbExport.pool || dbExport;

// GET /api/profile  (auth is applied in server.js via requireAuth)
router.get('/', async (req, res, next) => {
  try {
    // Example: return the current user's profile. Adjust query to your schema.
    // If your profile lives on "users", change the SQL accordingly.
    const { rows } = await pool.query(
      `SELECT id, username, name, phone
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile (update)
router.put('/', async (req, res, next) => {
  try {
    const { full_name, phone } = req.body;
    const { rows } = await pool.query(
      `UPDATE profiles
          SET full_name = $1, phone = $2
        WHERE user_id = $3
      RETURNING id, full_name, phone`,
      [full_name ?? null, phone ?? null, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
