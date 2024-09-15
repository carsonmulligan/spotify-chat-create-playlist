import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const YOUR_DOMAIN = process.env.DOMAIN || 'http://localhost:8888';
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const createCheckoutSession = async (req, res, db) => {
  try {
    const userId = req.session.userId;
    let customer;

    if (userId) {
      // Fetch user from database
      const result = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
      const user = result.rows[0];

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create or retrieve Stripe customer
      customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.user_id }
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${YOUR_DOMAIN}/subscription-success.html`,
      cancel_url: `${YOUR_DOMAIN}/subscription-cancelled.html`,
      customer: customer ? customer.id : undefined,
    });

    console.log('Checkout Session:', session); // Add this line for logging

    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.sendStatus(400);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Handle successful checkout session
      console.log('Checkout session completed:', session);
      // Update user's subscription status
      await updateUserSubscription(session.customer_email);
      break;
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!');
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
};

async function updateUserSubscription(email) {
  const db = global.app.locals.db;
  try {
    await db.query('UPDATE users SET is_subscribed = TRUE WHERE email = $1', [email]);
    console.log(`Updated subscription status for user: ${email}`);
  } catch (error) {
    console.error('Error updating user subscription status:', error);
  }
}

export const getConfig = (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
};