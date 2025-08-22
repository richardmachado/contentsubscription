// routes/buy.js
const router = require('express').Router();
const Stripe = require('stripe');
const dbExport = require('../db');
const pool = dbExport.pool || dbExport;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'usd';
// If DB stores dollars (e.g., 39.00), set PRICE_UNITS=dollars; if stores cents (e.g., 3900) use 'cents'
const PRICE_UNITS = process.env.PRICE_UNITS || 'cents';

const isUUID = (s) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

function getCallerOrigin(req) {
  // Most browsers send Origin on XHR/fetch
  const origin = req.get('origin');
  if (origin) return origin;
  // Some setups omit Origin but include Referer
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

    // Compute unit_amount (Stripe wants cents)
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

    const currency = DEFAULT_CURRENCY;

    // 🔑 Build return URLs from the caller's origin (fallback to FRONTEND_URL)
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
            currency,
            product_data: { name: content.title },
            unit_amount,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,

      // Helps you tie the session back to user/content quickly in dashboards/logs
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
