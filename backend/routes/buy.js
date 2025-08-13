// routes/buy.js
const express = require('express');
const Stripe = require('stripe');
const { query } = require('../db');

const router = express.Router();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
const stripe = new Stripe(STRIPE_KEY);

function getAmountInCents(content) {
  if (content.price_cents != null) {
    const n = Number(content.price_cents);
    if (!Number.isFinite(n) || n <= 0) throw new Error('Invalid price_cents');
    return Math.round(n);
  }
  const units = (process.env.PRICE_UNITS || 'cents').toLowerCase(); // 'dollars' | 'cents'
  const raw = Number(content.price);
  if (!Number.isFinite(raw) || raw <= 0) throw new Error('Invalid price');
  return units === 'dollars' ? Math.round(raw * 100) : Math.round(raw);
}

function looksLikeLiveHelp(content) {
  const slug = (content.slug || '').toLowerCase();
  const title = (content.title || '').toLowerCase();
  const kind = (content.kind || '').toLowerCase();
  const type = (content.type || '').toLowerCase();
  return (
    slug.includes('live-help') ||
    title.includes('live help') ||
    kind === 'service' ||
    type === 'live_help'
  );
}

async function findContent({ id, slug }) {
  if (id) {
    const { rows } = await query('SELECT * FROM content WHERE id = $1 LIMIT 1', [id]);
    return rows[0];
  }
  if (slug) {
    const { rows } = await query('SELECT * FROM content WHERE slug = $1 LIMIT 1', [slug]);
    return rows[0];
  }
  return null;
}

async function createCheckoutSession(user, content, reqQuantity) {
  if (!content) throw new Error('Content missing');

  const isLiveHelp = looksLikeLiveHelp(content);

  // Quantity: live help honors 1–5; everything else = 1
  let qty = 1;
  if (isLiveHelp) {
    const wanted = Number(reqQuantity || 1);
    qty = Math.min(Math.max(1, wanted), 5);
  }

  // Free items skip checkout
  if (content.is_premium === false) {
    return { action: 'open', url: `/content/${content.slug}` };
  }

  const unit_amount = getAmountInCents(content);

  // Build success/cancel URLs
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';
  const DASHBOARD_PATH = process.env.DASHBOARD_PATH || '/dashboard';

  const successBase = isLiveHelp
    ? `${APP_URL}${DASHBOARD_PATH}`
    : `${APP_URL}/content/${content.slug}`;

  const cancelBase = successBase; // send cancel to same place

  const success_url =
    `${successBase}?status=success&kind=${isLiveHelp ? 'live-help' : 'content'}` +
    `&slug=${encodeURIComponent(content.slug || '')}&hours=${qty}` +
    `&session_id={CHECKOUT_SESSION_ID}`;

  const cancel_url =
    `${cancelBase}?status=cancel&kind=${isLiveHelp ? 'live-help' : 'content'}` +
    `&slug=${encodeURIComponent(content.slug || '')}`;

  const lineItem = {
    price_data: {
      currency: 'usd',
      unit_amount,
      product_data: {
        name: isLiveHelp ? 'Live Help (1 hour)' : content.title,
        metadata: { content_id: String(content.id), slug: content.slug || '' },
      },
    },
    quantity: qty,
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    ...(user?.email ? { customer_email: user.email } : {}),
    line_items: [lineItem],
    success_url,
    cancel_url,
    metadata: {
      user_id: String(user.id),
      content_id: String(content.id),
      content_slug: content.slug || '',
      kind: isLiveHelp ? 'live-help' : 'content',
      hours: String(qty),
    },
  });

  return { action: 'redirect', url: session.url };
}

// POST /api/buy/:id  (expects Authorization; body may include { quantity })
router.post('/:id', async (req, res) => {
  try {
    const content = await findContent({ id: req.params.id });
    if (!content) return res.status(404).json({ error: 'Content not found' });

    const result = await createCheckoutSession(req.user, content, req.body?.quantity);
    res.json(result);
  } catch (e) {
    console.error('Buy error:', e);
    res.status(400).json({ error: e.message || 'Checkout failed' });
  }
});

// Optional: buy by slug
router.post('/slug/:slug', async (req, res) => {
  try {
    const content = await findContent({ slug: req.params.slug });
    if (!content) return res.status(404).json({ error: 'Content not found' });

    const result = await createCheckoutSession(req.user, content, req.body?.quantity);
    res.json(result);
  } catch (e) {
    console.error('Buy error:', e);
    res.status(400).json({ error: e.message || 'Checkout failed' });
  }
});

module.exports = router;
