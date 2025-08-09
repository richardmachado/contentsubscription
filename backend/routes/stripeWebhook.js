require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET);
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.sendStatus(400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const contentId = session.metadata.contentId;
    const safeQuantity = parseInt(session.metadata.safeQuantity || '0', 10);

    try {
      await pool.query(
        'INSERT INTO purchased_content (user_id, content_id, quantity) VALUES ($1, $2, $3)',
        [userId, contentId, safeQuantity]
      );
    } catch (err) {
      console.error('DB error:', err);
    }
  }

  res.sendStatus(200);
});

module.exports = router;
