// routes/markViewed.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// (optional) explicit preflight
router.options('/:id', (_req, res) => res.sendStatus(204));

router.post('/:id', async (req, res, next) => {
  try {
    const contentId = req.params.id;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // First try to mark as viewed if currently false/null
    const up = await pool.query(
      `
      UPDATE purchased_content
         SET viewed = TRUE
       WHERE user_id = $1
         AND content_id = $2
         AND (viewed IS DISTINCT FROM TRUE)
      `,
      [userId, contentId]
    );

    if (up.rowCount > 0) {
      return res.json({ ok: true, viewed: true, already: false });
    }

    // Nothing updated — check why
    const { rows } = await pool.query(
      `
      SELECT viewed
        FROM purchased_content
       WHERE user_id = $1 AND content_id = $2
       LIMIT 1
      `,
      [userId, contentId]
    );

    if (rows.length === 0) {
      // No purchase found for this user/content
      return res.status(404).json({ error: 'Not found' });
    }

    // Purchase exists but was already viewed
    return res.json({ ok: true, viewed: true, already: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
