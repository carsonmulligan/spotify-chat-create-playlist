// routes/stripeRoutes.js
import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeRoutes = (userPlaylistCounts, userSubscriptions) => {
  const router = express.Router();

  // Endpoint to create Stripe Checkout Session
  router.post('/create-checkout-session', async (req, res) => {
    const domainURL = req.headers.origin || 'http://localhost:8888';
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        success_url: `${domainURL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${domainURL}/cancel.html`,
      });

      res.json({ id: session.id });
    } catch (err) {
      console.error('Error creating checkout session:', err);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Endpoint to retrieve session info
  router.get('/checkout-session', async (req, res) => {
    const { sessionId } = req.query;
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      res.json(session);
    } catch (err) {
      console.error('Error retrieving checkout session:', err);
      res.status(500).json({ error: 'Failed to retrieve checkout session' });
    }
  });

  // Endpoint to update subscription status
  router.post('/subscribe', (req, res) => {
    const userId = req.userId;
    if (userId) {
      userSubscriptions[userId] = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'User not authenticated' });
    }
  });

  // Serve publishable key
  router.get('/config', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
  });

  return router;
};
