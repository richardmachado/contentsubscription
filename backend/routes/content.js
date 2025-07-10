const express = require('express');
const router = express.Router();
const pool = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const { auth } = require('../middleware/auth');

router.get('/content', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT c.*, 
      EXISTS (
        SELECT 1 FROM purchased_content pc 
        WHERE pc.user_id = $1 AND pc.content_id = c.id
      ) AS purchased
    FROM content c`,
    [req.user.id]
  );
  res.json(result.rows);
});

router.post('/buy/:id', auth, async (req, res) => {
  const contentRes = await pool.query('SELECT * FROM content WHERE id = $1', [req.params.id]);
  const content = contentRes.rows[0];
  if (!content) return res.status(404).json({ error: 'Content not found' });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: content.title },
          unit_amount: content.price,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.DOMAIN}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.DOMAIN}/dashboard`,
    metadata: {
      userId: req.user.id,
      contentId: content.id,
    },
  });

  res.json({ url: session.url });
});

module.exports = router;
