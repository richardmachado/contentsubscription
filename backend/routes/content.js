// backend/routes/content.js
const express = require('express');
const path = require('path');
const fs = require('fs');

// Support both export styles from ../db:
//   module.exports = { pool, query }  OR  module.exports = pool
const dbExport = require('../db');
const pool = dbExport.pool || dbExport;
// convenience query function
const runQuery = dbExport.query || ((...args) => pool.query(...args));

const router = express.Router();

const isUuid = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

/**
 * GET /api/content
 * List published lessons/cards with a "purchased" flag for the current user.
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.id || null;

    const { rows } = await runQuery(
      `
      SELECT
        c.id,
        c.slug,
        c.title,
        c.description,
        c.thumbnail_url,
        c.duration_min,
        c.level,
        c.tags,
        c.price,
        c.published,
        c.sort_order,
        COALESCE((
          SELECT TRUE
            FROM public.purchased_content pc
           WHERE pc.user_id = $1
             AND pc.content_id = c.id
        ), FALSE) AS purchased
      FROM public.content c
      WHERE c.published = TRUE
      ORDER BY c.sort_order ASC, c.created_at DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * IMPORTANT: Define specific routes BEFORE the generic "/:slugOrId" route
 * to avoid path shadowing.
 */

/**
 * GET /api/content/:slug/access
 * Resolve an access URL for one item.
 * NOTE: This assumes optional columns like kind/external_url/asset_path may exist in your schema.
 * If you don't use those, you can remove this route or adapt it accordingly.
 */
router.get('/:slug/access', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { rows } = await runQuery(
      `
      SELECT
        c.*,
        (pc.user_id IS NOT NULL) AS purchased
      FROM public.content c
      LEFT JOIN public.purchased_content pc
        ON pc.content_id = c.id AND pc.user_id = $1
      WHERE c.slug = $2
      LIMIT 1
      `,
      [userId, slug]
    );

    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'Not found' });

    const isPremium = Number(item.price || 0) > 0;
    if (isPremium && !item.purchased) {
      return res.status(403).json({ error: 'Not purchased' });
    }

    // Optional routing logic, only if you store these fields:
    if (item.kind === 'external' && item.external_url) {
      return res.json({ url: item.external_url });
    }
    if (item.kind === 'page' && item.slug) {
      return res.json({ url: `/learn/${item.slug}` });
    }
    if (item.kind === 'download' && item.asset_path) {
      return res.json({ url: `/api/content/${item.slug}/download` });
    }

    // Default: fall back to your lesson page
    return res.json({ url: `/content/${item.slug || item.id}` });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/content/:slug/download
 * Private download for items configured as downloads.
 * Requires an `asset_path` column on content.
 */
router.get('/:slug/download', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { rows } = await runQuery(
      `
      SELECT
        c.asset_path,
        c.price,
        (pc.user_id IS NOT NULL) AS purchased
      FROM public.content c
      LEFT JOIN public.purchased_content pc
        ON pc.content_id = c.id AND pc.user_id = $1
      WHERE c.slug = $2
      LIMIT 1
      `,
      [userId, slug]
    );

    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'Not found' });

    const isPremium = Number(item.price || 0) > 0;
    if (isPremium && !item.purchased) {
      return res.status(403).json({ error: 'Not purchased' });
    }

    const filePath = item.asset_path;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File missing' });
    }

    res.download(filePath, path.basename(filePath));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/content/:slugOrId
 * Fetch one lesson (includes body_md for detail view) by slug or UUID id.
 */
router.get('/:slugOrId', async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const userId = req.user?.id || null;

    const useId = isUuid(slugOrId);
    const { rows } = await runQuery(
      `
      SELECT
        c.*,
        COALESCE((
          SELECT TRUE
            FROM public.purchased_content pc
           WHERE pc.user_id = $2
             AND pc.content_id = c.id
        ), FALSE) AS purchased
      FROM public.content c
      WHERE ${useId ? 'c.id = $1' : 'c.slug = $1'}
        AND c.published = TRUE
      LIMIT 1
      `,
      [slugOrId, userId]
    );

    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'Not found' });

    res.json(item);
  } catch (err) {
    next(err);
  }
} );

// ---- ADMIN GUARD ----
function requireAdmin(req, res, next) {
  if (req.user?.is_admin) return next();
  return res.status(403).json({ error: 'Admin only' });
}

/**
 * POST /api/content  (admin)
 * Create a new lesson.
 */
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const {
      slug,
      title,
      description = '',
      body_md = '',
      price = 0,
      published = true,
      sort_order = 100,
      thumbnail_url = null,
      duration_min = null,
      level = null,
      tags = [],
    } = req.body;

    if (!slug || !title) {
      return res.status(400).json({ error: 'slug and title are required' });
    }

    const { rows } = await runQuery(
      `
      INSERT INTO public.content
        (slug, title, description, body_md, price, published, sort_order, thumbnail_url, duration_min, level, tags)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (slug) DO UPDATE
        SET title=$2, description=$3, body_md=$4, price=$5, published=$6,
            sort_order=$7, thumbnail_url=$8, duration_min=$9, level=$10, tags=$11,
            updated_at = now()
      RETURNING *
      `,
      [slug, title, description, body_md, price, published, sort_order, thumbnail_url, duration_min, level, JSON.stringify(tags)]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/content/:id  (admin)
 * Partial update.
 */
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const fields = [
      'slug','title','description','body_md','price','published',
      'sort_order','thumbnail_url','duration_min','level','tags'
    ];
    const sets = [];
    const values = [];
    let i = 1;

    for (const f of fields) {
      if (f in req.body) {
        sets.push(`${f} = $${i++}`);
        values.push(f === 'tags' ? JSON.stringify(req.body[f]) : req.body[f]);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const { rows } = await runQuery(
      `UPDATE public.content SET ${sets.join(', ')}, updated_at=now() WHERE id = $${i} RETURNING *`,
      values
    );

    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/content/:id  (admin)
 */
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    await runQuery(`DELETE FROM public.content WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});


module.exports = router;
