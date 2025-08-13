// routes/payments.js (CommonJS)
const express = require('express');
const Stripe = require('stripe');
const { query } = require('../db');
const { auth } = require('../middleware/auth');

if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

/**
 * GET /api/confirm-payment?session_id=cs_test_...
 * - Verifies Stripe session
 * - Checks it belongs to the current user
 * - Grants access (content purchase or live-help booking)
 * - Idempotent: safe to call multiple times
 */
router.get('/confirm-payment', auth, async (req, res) => {
  try {
    const sid = req.query.session_id;
    if (!sid) return res.status(400).json({ error: 'Missing session_id' });

    const session = await stripe.checkout.sessions.retrieve(sid, { expand: ['line_items'] });

    // Validate ownership
    const meta = session.metadata || {};
    const sameUserId = meta.user_id && String(meta.user_id) === String(req.user.id);
    const sameEmail =
      session.customer_email &&
      req.user?.email &&
      session.customer_email.toLowerCase() === req.user.email.toLowerCase();

    if (!sameUserId && !sameEmail) {
      return res.status(403).json({ error: 'Session does not belong to this user' });
    }

    // Ensure it's paid/complete
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) {
      return res.status(409).json({
        error: 'Payment not completed',
        status: session.payment_status || session.status,
      });
    }

    // Branch on kind
    const kind = meta.kind || 'content';

    if (kind === 'content') {
      // Grant purchased_content
      let contentId = meta.content_id ? Number(meta.content_id) : null;
      if (!contentId && meta.content_slug) {
        const { rows } = await query('SELECT id FROM content WHERE slug = $1 LIMIT 1', [
          meta.content_slug,
        ]);
        contentId = rows[0]?.id;
      }
      if (!contentId) return res.status(400).json({ error: 'Missing content id/slug in metadata' });

      await query(
        `INSERT INTO purchased_content (user_id, content_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, content_id) DO NOTHING`,
        [req.user.id, contentId]
      );

      return res.json({ ok: true, kind: 'content', content_id: contentId });
    }

    if (kind === 'live-help') {
      // Record booking (hours + optional slots)
      const hours = Math.min(Math.max(1, Number(meta.hours || 1)), 5);
      let slots = [];
      try {
        slots = meta.slots ? JSON.parse(meta.slots) : [];
      } catch (_) {}

      // Ensure table exists in your schema:
      // live_help_bookings(user_id int, hours int, slots jsonb, stripe_session_id text unique, created_at timestamptz)
      await query(
        `INSERT INTO live_help_bookings (user_id, hours, slots, stripe_session_id)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (stripe_session_id) DO NOTHING`,
        [req.user.id, hours, JSON.stringify(slots), session.id]
      );

      return res.json({ ok: true, kind: 'live-help', hours, slots });
    }

    // Fallback: nothing to grant
    return res.json({ ok: true, kind: 'unknown' });
  } catch (e) {
    console.error('confirm-payment error:', e);
    return res.status(400).json({ error: e.message || 'Confirm failed' });
  }
});

module.exports = router;
