// routes/buy.js
const express = require('express');
const Stripe = require('stripe');
const { query } = require('../db');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY');

function getAmountInCents(content) {
  if (content.price_cents != null) return Math.round(Number(content.price_cents));
  const units = (process.env.PRICE_UNITS || 'cents').toLowerCase();
  const raw = Number(content.price);
  if (!Number.isFinite(raw) || raw <= 0) throw new Error('Invalid content.price');
  return units === 'dollars' ? Math.round(raw * 100) : Math.round(raw);
}

async function findContent({ id }) {
  const { rows } = await query('SELECT * FROM content WHERE id = $1 LIMIT 1', [id]);
  return rows[0];
}

async function createCheckoutSession(user, content, reqQuantity) {
  if (!content) throw new Error('Content missing');

  // Identify the special Live Help item (by slug or title)
  const slug = (content.slug || '').toLowerCase();
  const title = (content.title || '').toLowerCase();
  const isLiveHelp = slug === 'live-help-session' || title === 'live help session';

  // For Live Help allow 1–5; for everything else, force 1
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
    success_url: `${process.env.APP_URL}/content/${content.slug}?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/content/${content.slug}?status=cancel`,
    metadata: {
      user_id: String(user.id),
      content_id: String(content.id),
      content_slug: content.slug || '',
      kind: isLiveHelp ? 'live-help' : 'content',
      hours: String(qty), // useful for webhook
    },
  });

  return { action: 'redirect', url: session.url };
}

// POST /api/buy/:id  (body may include { quantity })
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

module.exports = router;
