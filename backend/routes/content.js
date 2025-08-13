// routes/content.js (CommonJS)
const express = require('express');
const { query } = require('../db'); // make sure db.js exports { query }
const { requireAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// List cards with "purchased" flag
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows } = await query(
      `SELECT
        c.id,
        c.title,
        c.description,
        c.price,
        (pc.user_id IS NOT NULL) AS purchased,
        COALESCE(pc.viewed, false)        AS viewed
      FROM content c
      LEFT JOIN purchased_content pc
        ON pc.content_id = c.id
       AND pc.user_id    = $1
      ORDER BY c.title`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Access URL for one item
router.get('/:slug/access', requireAuth, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id;

    const { rows } = await query(
      `SELECT c.*, (pc.user_id IS NOT NULL) AS purchased
       FROM content c
       LEFT JOIN purchased_content pc
         ON pc.content_id = c.id AND pc.user_id = $1
       WHERE c.slug = $2
       LIMIT 1`,
      [userId, slug]
    );

    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (item.is_premium && !item.purchased) return res.status(403).json({ error: 'Not purchased' });

    if (item.kind === 'external' && item.external_url) return res.json({ url: item.external_url });
    if (item.kind === 'page') return res.json({ url: `/learn/${item.slug}` });
    if (item.kind === 'download' && item.asset_path)
      return res.json({ url: `/api/content/${item.slug}/download` });

    return res.status(400).json({ error: 'Misconfigured item' });
  } catch (err) {
    next(err);
  }
});

// Private download
router.get('/:slug/download', requireAuth, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id;

    const { rows } = await query(
      `SELECT c.asset_path, c.is_premium, (pc.user_id IS NOT NULL) AS purchased
       FROM content c
       LEFT JOIN purchased_content pc
         ON pc.content_id = c.id AND pc.user_id = $1
       WHERE c.slug = $2 AND c.kind='download'
       LIMIT 1`,
      [userId, slug]
    );

    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (item.is_premium && !item.purchased) return res.status(403).json({ error: 'Not purchased' });

    const filePath = item.asset_path;
    if (!filePath || !fs.existsSync(filePath))
      return res.status(404).json({ error: 'File missing' });
    res.download(filePath, path.basename(filePath));
  } catch (err) {
    next(err);
  }
});

module.exports = router; // <-- CommonJS export
