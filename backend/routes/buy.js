// routes/buy.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../db');

router.options('/:id', (_req, res) => res.sendStatus(204));

const isPriceId = (v) => typeof v === 'string' && /^price_[A-Za-z0-9]+$/.test(v);
const toEnvKey = (slug) =>
  `STRIPE_PRICE_${String(slug || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')}`;

async function fetchContentRow(contentId) {
  // Only select columns that actually exist in your schema
  const { rows } = await pool.query(
    `SELECT id, slug, title, stripe_price_id, price
     FROM content
     WHERE id = $1
     LIMIT 1`,
    [contentId]
  );
  return rows[0] || null;
}

function env(name, fallback) {
  const v = process.env[name];
  return v == null || v === '' ? fallback : v;
}

function computeAmountCents(row) {
  // If you later add price_cents, you can handle it here too.
  // Currently you only have "price". We’ll assume dollars by default.
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

router.post('/:id', async (req, res, next) => {
  try {
    const { id: contentId } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const appUrl = env('APP_URL', 'http://localhost:3000');
    const currency = env('CURRENCY', 'usd');
    const successPath = env('APP_SUCCESS_PATH', '/checkout');
    const cancelPath = env('APP_CANCEL_PATH', '/checkout');

    const row = await fetchContentRow(contentId);

    // 1) Try a real saved Stripe price_id
    let candidatePrice =
      (row?.stripe_price_id && isPriceId(row.stripe_price_id) && row.stripe_price_id) ||
      (row?.slug && process.env[toEnvKey(row.slug)] && isPriceId(process.env[toEnvKey(row.slug)])
        ? process.env[toEnvKey(row.slug)]
        : null) ||
      (process.env.STRIPE_PRICE_DEFAULT && isPriceId(process.env.STRIPE_PRICE_DEFAULT)
        ? process.env.STRIPE_PRICE_DEFAULT
        : null);

    let lineItem;
    if (candidatePrice) {
      lineItem = { price: candidatePrice, quantity: 1 };
    } else {
      // 2) Inline price via price_data using your "price" column
      const amount = computeAmountCents(row); // in cents
      const productName = row?.title || row?.slug || `Item ${contentId}`;
      console.warn(
        'Using price_data fallback. amount=%s, currency=%s, name=%s',
        amount,
        currency,
        productName
      );
      lineItem = {
        price_data: {
          currency,
          unit_amount: amount,
          product_data: { name: productName },
        },
        quantity: 1,
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [lineItem],
      allow_promotion_codes: true,
      client_reference_id: `${contentId}:${user.id}`,
      metadata: {
        content_id: contentId,
        user_id: String(user.id),
        user_email: user.email || '',
      },
      customer_email: user.email,
      success_url: `${appUrl}${successPath}?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${cancelPath}?status=cancelled`,
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
  