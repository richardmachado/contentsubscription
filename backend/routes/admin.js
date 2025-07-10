const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateAdmin } = require('../middleware/auth');

router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.name, u.phone, u.email,
        COALESCE(
          json_agg(
            json_build_object(
              'item', c.title,
              'timestamp', pc.created_at
            )
          ) FILTER (WHERE c.title IS NOT NULL),
          '[]'
        ) AS purchased
      FROM users u
      LEFT JOIN purchased_content pc ON u.id = pc.user_id
      LEFT JOIN content c ON pc.content_id = c.id
      GROUP BY u.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
