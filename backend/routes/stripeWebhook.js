// routes/stripeWebhook.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../db');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function recordPurchaseFromSession(session) {
  // We stored these in the Checkout session in /routes/buy.js metadata
  const contentId = session.metadata?.content_id;
  const userId = session.metadata?.user_id;

  if (!contentId || !userId) {
    console.warn('⚠️ Missing metadata on session:', session.id, session.metadata);
    return;
  }

  // Upsert purchase
  await pool.query(
    `
    INSERT INTO purchased_content (user_id, content_id, purchased_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT DO NOTHING
    `,
    [userId, contentId]
  );
}

router.post('/', async (req, res) => {
  let event;
  const sig = req.headers['stripe-signature'];

  try {
    // req.body is a Buffer thanks to express.raw on /webhook
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await recordPurchaseFromSession(session);
        break;
      }
      // You can handle more event types if needed:
      // case 'checkout.session.async_payment_succeeded':
      // case 'payment_intent.succeeded':
      default:
        // ignore others
        break;
    }
    // Always 200 quickly so Stripe stops retrying
    return res.sendStatus(200);
  } catch (err) {
    console.error('💥 Webhook handler failed:', err);
    return res.status(500).send('Webhook handler error');
  }
});

module.exports = router;
