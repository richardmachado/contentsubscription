const express = require('express');
const router = express.Router();
const pool = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const { auth } = require('../middleware/auth');

const domain = process.env.DOMAIN || 'http://localhost:3000';

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
  const safeQuantity = Math.max(1, Math.min(Number(quantity) || 1, 10)); // caps between 1–10
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
              name: `${content.title} (${safeQuantity} hr${safeQuantity > 1 ? 's' : ''})`,
            },
            unit_amount: content.price, // this is price per hour (e.g. 9900)
          },
          quantity: safeQuantity, // 👈 dynamic
        },
      ],
      mode: 'payment',
      success_url: `${domain}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/dashboard`,
      metadata: {
        userId: req.user.id,
        contentId: content.id,
        safeQuantity, // ✅ Step 3: track it if needed
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

router.get('/live-help-hours', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT SUM(quantity) as total_hours
      FROM purchased_content pc
      JOIN content c ON pc.content_id = c.id
      WHERE pc.user_id = $1 AND c.title = 'Live Help Session'
    `,
      [req.user.id]
    );

    const total = result.rows[0].total_hours || 0;
    res.json({ totalHours: total });
  } catch (err) {
    console.error('Error fetching live help hours:', err);
    res.status(500).json({ error: 'Could not load live help data' });
  }
});

// routes/content.js
router.post('/mark-viewed/:contentId', auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE purchased_content
       SET viewed = TRUE
       WHERE user_id = $1 AND content_id = $2`,
      [req.user.id, req.params.contentId]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Error marking content as viewed:', err);
    res.status(500).json({ error: 'Could not mark as viewed' });
  }
});

module.exports = router;
