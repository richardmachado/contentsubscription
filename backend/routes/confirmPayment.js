// routes/confirmPayment.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { query } = require('../db'); // keep your helper; it wraps pool.query

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// GET /api/confirm-payment?session_id=cs_...
router.get('/', async (req, res, next) => {
  try {
    const { session_id } = req.query;
    const userId = req.user?.id; // from auth middleware

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      // expand so we can read price/product metadata if needed
      expand: ['line_items', 'line_items.data.price.product', 'payment_intent'],
    });

    if (session.mode !== 'payment') {
      return res.status(400).json({ error: 'Not a payment Checkout session' });
    }
    if (session.payment_status !== 'paid') {
      return res
        .status(409)
        .json({ error: 'Payment not completed', status: session.payment_status });
    }

    // Optionally verify session belongs to this user (recommended)
    const metaUserId = session.metadata?.user_id;
    if (metaUserId && String(metaUserId) !== String(userId)) {
      return res.status(403).json({ error: 'This session does not belong to the current user' });
    }

    // Map purchased items → our content_id(s)
    // Prefer metadata.content_id on the *Price* (or Product) so a single route works for many items.
    const lineItems = session.line_items?.data || [];
    let mapped = lineItems
      .map((li) => {
        const price = li.price;
        const product = price?.product;
        const contentId =
          price?.metadata?.content_id ||
          product?.metadata?.content_id ||
          session.metadata?.content_id || // fallback if you set it on the session
          null;

        return {
          contentId,
          quantity: li.quantity || Number(session.metadata?.quantity || 1) || 1,
        };
      })
      .filter((x) => !!x.contentId);

    if (mapped.length === 0) {
      return res
        .status(422)
        .json({ error: 'No content_id found on line items or session metadata' });
    }

    // Upsert into public.purchased_content
    // Table columns (from your screenshot): id, user_id, content_id, quantity, viewed, created_at, purchased_at
    await query('BEGIN');
    for (const m of mapped) {
      await query(
        `
        INSERT INTO public.purchased_content (user_id, content_id, quantity, purchased_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, content_id)
        DO UPDATE SET
          quantity = public.purchased_content.quantity + EXCLUDED.quantity,
          purchased_at = GREATEST(public.purchased_content.purchased_at, EXCLUDED.purchased_at)
        `,
        [userId, m.contentId, m.quantity]
      );
    }
    await query('COMMIT');

    // Return what the UI needs (optional)
    const { rows: purchasedNow } = await query(
      `
      SELECT c.*, TRUE AS purchased, pc.purchased_at
      FROM public.purchased_content pc
      JOIN public.content c ON c.id = pc.content_id
      WHERE pc.user_id = $1
      ORDER BY pc.purchased_at DESC
      `,
      [userId]
    );

    return res.json({ ok: true, purchased: purchasedNow.length, items: purchasedNow });
  } catch (err) {
    try {
      await query('ROLLBACK');
    } catch (_) {}
    next(err);
  }
});

module.exports = router;
