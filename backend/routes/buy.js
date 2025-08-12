// routes/buy.js
const express = require('express');
const Stripe = require('stripe');
const { query } = require('../db');

const router = express.Router();

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET_KEY');
const stripe = new Stripe(STRIPE_KEY);

// Convert your DB price to cents
function getAmountInCents(content) {
  // Prefer explicit cents column if you have it
  if (content.price_cents != null) {
    const n = Number(content.price_cents);
    if (!Number.isFinite(n) || n <= 0) throw new Error('Invalid price_cents');
    return Math.round(n);
  }

  // Otherwise derive from price with a hint about units
  const units = (process.env.PRICE_UNITS || 'cents').toLowerCase(); // 'dollars' or 'cents'
  const raw = Number(content.price);
  if (!Number.isFinite(raw) || raw <= 0) throw new Error('Invalid price');

  return units === 'dollars' ? Math.round(raw * 100) : Math.round(raw);
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

async function createCheckoutSession(user, content) {
  if (!content) throw new Error('Content missing');

  // Free items skip checkout entirely
  if (content.is_premium === false) {
    return { action: 'open', url: `/content/${content.slug}` };
  }

  const amount = getAmountInCents(content);

  const lineItem = {
    price_data: {
      currency: 'usd',
      unit_amount: amount, // ← cents from DB
      product_data: {
        name: content.title,
        metadata: { content_id: String(content.id), slug: content.slug || '' },
      },
    },
    quantity: 1,
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    ...(user?.email ? { customer_email: user.email } : {}), // optional
    line_items: [lineItem],
    success_url: `${process.env.APP_URL}/content/${content.slug}?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/content/${content.slug}?status=cancel`,
    metadata: {
      user_id: String(user.id),
      content_id: String(content.id),
      content_slug: content.slug || '',
    },
  });

  return { action: 'redirect', url: session.url };
}

// POST /api/buy/:id (content.id UUID)
router.post('/:id', async (req, res) => {
  try {
    const content = await findContent({ id: req.params.id });
    if (!content) return res.status(404).json({ error: 'Content not found' });
    const result = await createCheckoutSession(req.user, content);
    res.json(result); // { action, url }
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
    const result = await createCheckoutSession(req.user, content);
    res.json(result);
  } catch (e) {
    console.error('Buy error:', e);
    res.status(400).json({ error: e.message || 'Checkout failed' });
  }
});

module.exports = router;
