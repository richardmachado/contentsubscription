// routes/confirmPayment.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { query } = require('../db');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// GET /api/confirm-payment?session_id=cs_...
router.get('/', async (req, res, next) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

    // Pull the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'payment_intent'],
    });

    // Sanity checks
    if (session.mode !== 'payment') {
      return res.status(400).json({ error: 'Not a payment Checkout session' });
    }
    if (session.payment_status !== 'paid') {
      return res
        .status(400)
        .json({ error: 'Payment not completed yet', status: session.payment_status });
    }

    // Verify it belongs to this user (we stored user_id in metadata when creating the session)
    const userId = String(req.user.id);
    const metaUserId = String(session.metadata?.user_id || '');
    if (metaUserId && metaUserId !== userId) {
      return res.status(403).json({ error: 'This session does not belong to the current user' });
    }

    // Identify what was purchased
    const contentId = session.metadata?.content_id; // we’ll set this in /buy
    const quantity = Number(session.metadata?.quantity || 1);
    if (!contentId) {
      return res.status(400).json({ error: 'Missing content_id in session metadata' });
    }

    // Record purchase (idempotent)
    // Adjust this SQL to match YOUR schema.
    // Example schema:
    //   purchases(user_id uuid, content_id uuid, quantity int, created_at timestamptz DEFAULT now(),
    //             PRIMARY KEY(user_id, content_id))
    await query(
      `INSERT INTO purchases (user_id, content_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, content_id)
       DO UPDATE SET quantity = purchases.quantity + EXCLUDED.quantity`,
      [userId, contentId, quantity]
    );

    // Return the updated purchased items for this user (adjust to your schema)
    const { rows: purchased } = await query(
      `SELECT c.*
         FROM purchases p
         JOIN content c ON c.id = p.content_id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC`,
      [userId]
    );

    return res.json({ ok: true, purchased });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
