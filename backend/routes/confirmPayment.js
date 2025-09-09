// routes/confirmPayment.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { query } = require('../db');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const LIVE_HELP_PRICE_CENTS = Number(process.env.LIVE_HELP_PRICE_CENTS) || 5000;

function isUUID(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

// GET /api/confirm-payment?session_id=cs_...
router.get('/', async (req, res, next) => {
  try {
    const { session_id } = req.query;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
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

    // Safety: ensure session belongs to this user if metadata contains it
    const metaUserId = session.metadata?.user_id;
    if (metaUserId && String(metaUserId) !== String(userId)) {
      return res.status(403).json({ error: 'This session does not belong to the current user' });
    }

    const meta = session.metadata || {};
    const ref = session.client_reference_id || '';
    const [, refContent] = ref.split(':'); // "<user_id>:<content_id or live_help>"
    const isLiveHelp = meta.type === 'live_help' || refContent === 'live_help';

    if (isLiveHelp) {
      // ---- LIVE HELP CONFIRM (IDEMPOTENT) ----
      // Determine hours (prefer explicit metadata, then line item quantities, then derive from amount)
      let hours = Number(meta.hours || 0);
      if (!Number.isFinite(hours) || hours <= 0) {
        const lineItems = session.line_items?.data || [];
        const sumQty = lineItems.reduce((sum, li) => sum + Number(li.quantity || 0), 0);
        hours = Number.isFinite(sumQty) && sumQty > 0 ? sumQty : 0;
      }
      if (!Number.isFinite(hours) || hours <= 0) {
        const total = Number(session.amount_total || 0);
        hours =
          LIVE_HELP_PRICE_CENTS > 0 && total > 0
            ? Math.max(1, Math.round(total / LIVE_HELP_PRICE_CENTS))
            : 1;
      }

      const sessionBlockId =
        meta.session_id && String(meta.session_id).trim() ? String(meta.session_id) : null;

      // Transaction: insert purchase (unique by stripe_session_id); only if inserted, bump totals
      await query('BEGIN');
      let inserted = false;
      try {
        const ins = await query(
          `
          INSERT INTO live_help_purchases
            (user_id, stripe_session_id, hours, amount_cents, session_block_id, purchased_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (stripe_session_id) DO NOTHING
          RETURNING id
          `,
          [userId, session.id, hours, session.amount_total || 0, sessionBlockId]
        );

        inserted = ins.rowCount === 1;

        if (inserted) {
          // Only increment totals on first insert for this Stripe session (idempotent)
          await query(
            `
            INSERT INTO user_live_help_totals (user_id, hours_total)
            VALUES ($1, $2)
            ON CONFLICT (user_id)
            DO UPDATE SET hours_total = user_live_help_totals.hours_total + EXCLUDED.hours_total
            `,
            [userId, hours]
          );
        }

        await query('COMMIT');
      } catch (e) {
        await query('ROLLBACK').catch(() => {});
        // If your schema tables don't exist, you can either throw or silently continue.
        // Throw to surface server issues:
        throw e;
      }

      return res.json({
        ok: true,
        type: 'live_help',
        hours,
        idempotent: !inserted, // true if this was a repeat confirm
        session_id,
      });
    }

    // ---- CONTENT CONFIRM (existing behavior) ----
    const lineItems = session.line_items?.data || [];
    const mapped = lineItems
      .map((li) => {
        const price = li.price;
        const product = price?.product;
        const contentId =
          price?.metadata?.content_id ||
          product?.metadata?.content_id ||
          session.metadata?.content_id ||
          (isUUID(refContent) ? refContent : null);
        return {
          contentId,
          quantity: li.quantity || Number(session.metadata?.quantity || 1) || 1,
        };
      })
      .filter((x) => !!x.contentId && isUUID(x.contentId));

    if (mapped.length === 0) {
      return res
        .status(422)
        .json({ error: 'No content_id found on line items or session metadata' });
    }

    await query('BEGIN');
    try {
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
    } catch (e) {
      await query('ROLLBACK').catch(() => {});
      throw e;
    }

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

    return res.json({
      ok: true,
      type: 'content',
      purchased: purchasedNow.length,
      items: purchasedNow,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
