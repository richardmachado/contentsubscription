// routes/buy.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { pool } = require('../db');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ---------- Env helpers ----------
const env = (name, fallback) => {
  const v = process.env[name];
  return v == null || v === '' ? fallback : v;
};

// Where to send the user after checkout
const FRONTEND_ORIGIN = env('APP_URL', 'http://localhost:3000'); // or FRONTEND_ORIGIN if you prefer
const SUCCESS_PATH = env('APP_SUCCESS_PATH', '/dashboard'); // e.g. /dashboard
const CANCEL_PATH = env('APP_CANCEL_PATH', '/dashboard'); // fixed typo
const CURRENCY = env('CURRENCY', 'usd');

// ---------- Utilities ----------
const isPriceId = (v) => typeof v === 'string' && /^price_[A-Za-z0-9]+$/.test(v);
const toEnvKey = (slug) =>
  `STRIPE_PRICE_${String(slug || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')}`;

async function fetchContentRow(contentId) {
  // match your actual schema (id, slug, title, stripe_price_id, price)
  const { rows } = await pool.query(
    `SELECT id, slug, title, stripe_price_id, price
       FROM content
      WHERE id = $1
      LIMIT 1`,
    [contentId]
  );
  return rows[0] || null;
}

// Convert your DB "price" to cents.
// If PRICE_IS_CENTS=true, treat DB value as cents already.
// Else treat as dollars and multiply by 100.
function computeAmountCents(row) {
  if (row && row.price != null) {
    const raw = Number(row.price);
    if (Number.isFinite(raw)) {
      const isCents = String(process.env.PRICE_IS_CENTS).toLowerCase() === 'true';
      return isCents ? Math.round(raw) : Math.round(raw * 100);
    }
  }
  const fallback = parseInt(process.env.PRICE_FALLBACK_CENTS || '100', 10);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 100;
}

// Allow CORS preflight on this route
router.options('/:id', (_req, res) => res.sendStatus(204));

// ---------- Create Checkout Session ----------
router.post('/:id', async (req, res, next) => {
  try {
    const { id: contentId } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // quantity from client (default 1, clamp 1..10)
    const quantity = Math.max(1, Math.min(10, Number(req.body?.quantity || 1)));

    // Fetch content row
    const row = await fetchContentRow(contentId);
    if (!row) return res.status(404).json({ error: 'Content not found' });

    // Try explicit Stripe Price from DB or env, else use price_data fallback
    let candidatePrice =
      (row.stripe_price_id && isPriceId(row.stripe_price_id) && row.stripe_price_id) ||
      (row.slug && process.env[toEnvKey(row.slug)] && isPriceId(process.env[toEnvKey(row.slug)])
        ? process.env[toEnvKey(row.slug)]
        : null) ||
      (process.env.STRIPE_PRICE_DEFAULT && isPriceId(process.env.STRIPE_PRICE_DEFAULT)
        ? process.env.STRIPE_PRICE_DEFAULT
        : null);

    let lineItem;
    if (candidatePrice) {
      lineItem = { price: candidatePrice, quantity };
    } else {
      const amount = computeAmountCents(row); // cents per unit
      const productName = row.title || row.slug || `Item ${contentId}`;
      console.warn(
        'Using price_data fallback. amount=%s, currency=%s, name=%s',
        amount,
        CURRENCY,
        productName
      );
      lineItem = {
        price_data: {
          currency: CURRENCY,
          unit_amount: amount, // cents per unit
          product_data: { name: productName },
        },
        quantity,
      };
    }

    // Success/cancel URLs
    const success_url = `${FRONTEND_ORIGIN}${SUCCESS_PATH}?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${FRONTEND_ORIGIN}${CANCEL_PATH}?status=cancelled`;

    // Create session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [lineItem],
      allow_promotion_codes: true,
      customer_email: user.email, // or use a saved customer id
      client_reference_id: `${contentId}:${user.id}`,
      // IMPORTANT: metadata used by /api/confirm-payment and/or webhook
      metadata: {
        content_id: contentId,
        user_id: String(user.id),
        user_email: user.email || '',
        quantity: String(quantity),
      },
      success_url,
      cancel_url,
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe session creation failed:', err);
    if (!res.headersSent) {
      return res.status(400).json({ error: err.message || 'Failed to create checkout session' });
    }
    next(err);
  }
});

module.exports = router;
