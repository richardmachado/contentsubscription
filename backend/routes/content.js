const express = require('express');
const router = express.Router();
const pool = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const { auth } = require('../middleware/auth');

router.get('/content', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
        EXISTS (
          SELECT 1 FROM purchased_content pc 
          WHERE pc.user_id = $1 AND pc.content_id = c.id
        ) AS purchased
      FROM content c`,
      [req.user.id]
    );

    const repeatableTitles = ['Live Help Session'];

    // For repeatable content, force purchased = false
    const modified = result.rows.map((item) => {
      if (repeatableTitles.includes(item.title)) {
        return { ...item, purchased: false };
      }
      return item;
    });

    res.json(modified);
  } catch (err) {
    console.error('Error fetching content:', err);
    res.status(500).json({ error: 'Could not load content' });
  }
});

router.post('/buy/:id', auth, async (req, res) => {
  const { quantity = 1 } = req.body || {}; // ✅ Step 1: get quantity from frontend

  try {
    const contentRes = await pool.query('SELECT * FROM content WHERE id = $1', [req.params.id]);
    const content = contentRes.rows[0];
    if (!content) return res.status(404).json({ error: 'Content not found' });

    // ✅ Step 2: use quantity when creating checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${content.title} (${quantity} hr${quantity > 1 ? 's' : ''})`,
            },
            unit_amount: content.price, // this is price per hour (e.g. 9900)
          },
          quantity, // 👈 dynamic
        },
      ],
      mode: 'payment',
      success_url: `${process.env.DOMAIN}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/dashboard`,
      metadata: {
        userId: req.user.id,
        contentId: content.id,
        quantity, // ✅ Step 3: track it if needed
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: 'Could not create checkout session' });
  }
});

router.get('/confirm-payment', auth, async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({ success: session.payment_status === 'paid', session });
  } catch (err) {
    console.error('Error verifying session:', err);
    res.status(500).json({ error: 'Failed to verify payment session' });
  }
});

module.exports = router;
