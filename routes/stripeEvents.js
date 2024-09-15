import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const YOUR_DOMAIN = process.env.FRONTEND_URI || 'http://localhost:8888';
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const createCheckoutSession = async (req, res, db) => {
  console.log('Creating checkout session');
  const userId = req.session.userId;

  console.log('User ID from session:', userId);

  if (!userId) {
    console.log('User not authenticated');
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const user = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);

  console.log('User from database:', user);

  if (!user) {
    console.log('User not found in database');
    return res.status(401).json({ error: 'User not found' });
  }

  try {
    console.log('Creating Stripe checkout session');
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${YOUR_DOMAIN}/subscription-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/subscription-cancelled.html`,
      automatic_tax: {enabled: true},
      customer_email: user.email,
    });

    console.log('Checkout session created:', session.id);
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe Checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
};

export const handleWebhook = async (req, res, db) => {
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
      const email = session.customer_email;
      try {
        await db.run('UPDATE users SET is_subscribed = TRUE WHERE email = ?', [email]);
        console.log(`User with email ${email} has been subscribed.`);
      } catch (dbError) {
        console.error('Database update failed:', dbError);
      }
      break;
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      // You can add additional handling here if needed
      break;
    case 'payment_method.attached':
      const paymentMethod = event.data.object;
      console.log('PaymentMethod was attached to a Customer!');
      // You can add additional handling here if needed
      break;
    default:
      console.log(`Unhandled event type ${event.type}.`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
};

export const getConfig = (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
};