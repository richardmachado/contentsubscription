// routes/liveHelpHour.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // make sure db.js exports { pool }

// GET /api/live-help-hour
// Returns: { sessions: [...], totalHours: number }
router.get('/', async (req, res, next) => {
  try {
    // Require auth to report per-user totals
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1) Upcoming sessions (unchanged logic)
    const { rows: sessions } = await pool.query(`
      SELECT id, starts_at, ends_at, capacity, spots_booked, is_cancelled
      FROM live_help_hours
      WHERE starts_at >= NOW() AND NOT is_cancelled
      ORDER BY starts_at ASC
      LIMIT 20
    `);

    // 2) Compute totalHours for this user.
    // Try fast path (user_live_help_totals), then fall back to summing live_help_purchases.
    let totalHours = 0;

    // Try totals table first
    try {
      const { rows } = await pool.query(
        `SELECT hours_total FROM user_live_help_totals WHERE user_id = $1`,
        [userId]
      );
      if (rows.length > 0 && rows[0].hours_total != null) {
        totalHours = Number(rows[0].hours_total) || 0;
      } else {
        // If no row exists, fall through to purchases fallback
        throw new Error('no_totals_row');
      }
    } catch (_e) {
      // Fallback: sum from detailed purchases table
      try {
        const { rows } = await pool.query(
          `SELECT COALESCE(SUM(hours), 0)::int AS hours
             FROM live_help_purchases
            WHERE user_id = $1`,
          [userId]
        );
        totalHours = Number(rows[0]?.hours || 0);
      } catch (_e2) {
        // If tables don't exist yet, default to 0
        totalHours = 0;
      }
    }

    res.json({ sessions, totalHours });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
