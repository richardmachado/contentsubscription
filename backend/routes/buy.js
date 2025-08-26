// routes/buy.js
const router = require('express').Router();
const Stripe = require('stripe');
const dbExport = require('../db');
const pool = dbExport.pool || dbExport;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'usd';
// If DB stores dollars (e.g., 39.00), set PRICE_UNITS=dollars; if stores cents (e.g., 3900) use 'cents'
const PRICE_UNITS = process.env.PRICE_UNITS || 'cents';

// Live Help config — price in CENTS per hour
const LIVE_HELP_PRICE_CENTS = Number(process.env.LIVE_HELP_PRICE_CENTS) || 3000; // $30/hr default
const LIVE_HELP_TITLE = process.env.LIVE_HELP_TITLE || 'Live Help Session';

const isUUID = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

function getCallerOrigin(req) {
  const origin = req.get('origin');
  if (origin) return origin;
  const ref = req.get('referer');
  if (ref) {
    try {
      return new URL(ref).origin;
    } catch (_) {}
  }
  return null;
}

router.post(['/', '/:contentId'], async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const contentId = req.params.contentId || req.body.contentId;

    // ---- SPECIAL CASE: Live Help checkout (non-UUID id) ----
    if (contentId === 'live_help') {
      // Hours are represented by quantity (limit to a sane range)
      let quantity = Number(req.body?.quantity ?? 1);
      if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;
      if (quantity > 24) quantity = 24; // hard cap

      const sessionIdFromClient = req.body?.session_id; // optional; if you target a specific block

      // OPTIONAL: validate capacity for a specific session (if provided)
      if (sessionIdFromClient) {
        const { rows } = await pool.query(
          `SELECT id, capacity, spots_booked, is_cancelled, starts_at, ends_at
             FROM live_help_hours
            WHERE id = $1`,
          [sessionIdFromClient]
        );
        const s = rows[0];
        if (!s || s.is_cancelled || Number(s.spots_booked) >= Number(s.capacity)) {
          return res.status(400).json({ error: 'Selected session unavailable.' });
        }
      }

      const callerOrigin = getCallerOrigin(req);
      const frontendBase = (
        callerOrigin ||
        process.env.FRONTEND_URL ||
        'https://contentsubscription.vercel.app'
      ).replace(/\/+$/, '');
      const successUrl = `${frontendBase}/?status=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendBase}/?status=cancel`;

      // Stripe line item: price per hour, quantity = hours
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: DEFAULT_CURRENCY,
              product_data: {
                name: LIVE_HELP_TITLE,
                description:
                  quantity === 1
                    ? '1 hour of one-on-one help'
                    : `${quantity} hours of one-on-one help`,
              },
              unit_amount: LIVE_HELP_PRICE_CENTS, // cents per hour
            },
            quantity,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: `${req.user.id}:live_help`,
        metadata: {
          type: 'live_help',
          user_id: String(req.user.id),
          hours: String(quantity),
          session_id: sessionIdFromClient || '',
        },
        // customer_email: req.user.email || undefined,
      });

      return res.json({ id: session.id, url: session.url });
    }

    // ---- DEFAULT: normal content by UUID ----
    if (!contentId || !isUUID(contentId)) {
      return res.status(400).json({ error: 'contentId is required' });
    }

    const { rows } = await pool.query(
      `SELECT id, title, price, slug
         FROM content
        WHERE id = $1`,
      [contentId]
    );
    const content = rows[0];
    if (!content) return res.status(404).json({ error: 'Content not found' });

    if (content.price == null) return res.status(400).json({ error: 'Price missing' });

    let unit_amount;
    if (PRICE_UNITS === 'dollars') {
      unit_amount = Math.round(Number(content.price) * 100);
    } else {
      unit_amount = Number(content.price);
    }
    if (!Number.isFinite(unit_amount) || unit_amount <= 0) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    const callerOrigin = getCallerOrigin(req);
    const frontendBase = (
      callerOrigin ||
      process.env.FRONTEND_URL ||
      'https://contentsubscription.vercel.app'
    ).replace(/\/+$/, '');
    const successUrl = `${frontendBase}/?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendBase}/?status=cancel`;

    console.log('[checkout return]', {
      origin: callerOrigin,
      FRONTEND_URL: process.env.FRONTEND_URL,
      successUrl,
      cancelUrl,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: DEFAULT_CURRENCY,
            product_data: { name: content.title },
            unit_amount,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: `${req.user.id}:${content.id}`,
      metadata: {
        user_id: String(req.user.id),
        content_id: String(content.id),
      },
      // customer_email: req.user.email || undefined,
    });

    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
