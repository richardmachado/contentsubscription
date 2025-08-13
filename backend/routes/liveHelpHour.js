// routes/liveHelpHour.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // make sure db.js exports { pool }

router.get('/', async (req, res, next) => {
  try {
    // Return upcoming sessions (customize as you like)
    const { rows } = await pool.query(`
      SELECT id, starts_at, ends_at, capacity, spots_booked, is_cancelled
      FROM live_help_hours
      WHERE starts_at >= NOW() AND NOT is_cancelled
      ORDER BY starts_at ASC
      LIMIT 20
    `);
    res.json({ sessions: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
