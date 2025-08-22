// server/routes/checkout.js
import Stripe from 'stripe';
import { getFrontendOrigin } from '../config/origin.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(req, res) {
  try {
    const FRONTEND_ORIGIN = getFrontendOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: req.body.line_items, // your Price IDs + quantities
      success_url: `${FRONTEND_ORIGIN}/dashboard?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_ORIGIN}/dashboard?status=cancelled`,
      // optional:
      // customer_email: req.user?.email,
      // allow_promotion_codes: true,
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('createCheckoutSession error', err);
    res.status(500).json({ error: 'Unable to create session' });
  }
}
