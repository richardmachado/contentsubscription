// backend/routes/profile.js
const express = require('express');
const router = express.Router();

// Handle both export styles for db: module.exports = pool OR { pool }
const dbExport = require('../db');
const pool = dbExport.pool || dbExport;

// GET /api/profile  (auth is applied in server.js via requireAuth)
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, username, email, name, phone, is_admin
        FROM public.users
       WHERE id = $1
       LIMIT 1
      `,
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    next(err);
  }
});

// PUT /api/profile  — update selected fields on public.users
router.put('/', async (req, res, next) => {
  try {
    // Accept the fields you want to allow updating:
    const { name, phone, email } = req.body;

    const { rows } = await pool.query(
      `
      UPDATE public.users
         SET name  = COALESCE($1, name),
             phone = COALESCE($2, phone),
             email = COALESCE($3, email)
       WHERE id = $4
   RETURNING id, username, email, name, phone, is_admin
      `,
      [
        name ?? null, // pass null to leave unchanged via COALESCE
        phone ?? null,
        email ?? null,
        req.user.id,
      ]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
