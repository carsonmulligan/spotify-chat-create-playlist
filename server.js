import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import { spotifyLogin, spotifyCallback } from './routes/spotifyAuth.js';
import { generatePlaylistFromGPT } from './routes/openAI.js';
import { createPlaylist } from './routes/createPlaylist.js';
import { createCheckoutSession, handleWebhook, getConfig } from './routes/stripeEvents.js';
import cookieParser from 'cookie-parser';
import SpotifyWebApi from 'spotify-web-api-node';
import pg from 'pg';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import winston from 'winston';
import { refreshAccessToken } from './routes/spotifyAuth.js';
import connectPgSimple from 'connect-pg-simple';
import stripe from 'stripe';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

// Middleware

// Set Content Security Policy before any other middleware
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; frame-src https://js.stripe.com;"
  );
  next();
});

// Use Helmet for security headers (disable its CSP to prevent conflicts)
app.use(helmet({
  contentSecurityPolicy: false,
}));

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = isProduction 
  ? ['https://www.tunesmith-ai.com', 'https://tunesmith-ai.com'] 
  : ['http://localhost:8888'];

app.use(cors({
  origin: function(origin, callback) {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);

// PostgreSQL database initialization
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000
});

const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: pool,                // Reuse the existing database pool
    tableName: 'user_sessions' // You'll need to create this table
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: isProduction ? 'auto' : false, // 'auto' for production, false for development
    httpOnly: true,
    sameSite: 'lax', // 'lax' is more permissive than 'strict' and works better with OAuth flows
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files after setting CSP
app.use(express.static('public'));

// Setup rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Setup Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'playlist-service' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

// If we're not in production then log to the console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

// Setup Morgan to use Winston for HTTP request logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  logger.info('Query:', req.query);
  logger.info('Body:', req.body);
  logger.info('Session:', req.session);
  next();
});

pool.on('connect', (client) => {
  logger.info('New client connected to the database');
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
});

// Modify the existing database connection test
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Error connecting to the database', err);
    logger.error('Connection details:', {
      host: pool.options.host,
      port: pool.options.port,
      database: pool.options.database,
      user: pool.options.user,
      // Don't log the password
    });
  } else {
    logger.info('Successfully connected to the database');
    logger.info('Database time:', res.rows[0].now);
  }
});

app.locals.db = {
  query: (text, params) => pool.query(text, params),
};

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Error connecting to the database', err);
  } else {
    logger.info('Successfully connected to the database');
  }
});

// Create the users table if it doesn't exist
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(255),
        playlist_count INTEGER NOT NULL DEFAULT 0,
        is_subscribed BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    logger.info('Users table created or already exists');
  } catch (error) {
    logger.error('Error creating users table:', error);
  }
})();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// Middleware to check if the user is authenticated
const checkAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Auth routes
app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);
app.get('/check-auth', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ authenticated: false });
  }

  const db = app.locals.db;
  try {
    const result = await db.query('SELECT is_subscribed FROM users WHERE user_id = $1', [req.session.userId]);
    const user = result.rows[0];
    res.json({ authenticated: true, isSubscribed: user.is_subscribed });
  } catch (error) {
    logger.error('Error checking subscription status:', error);
    res.status(500).json({ authenticated: false });
  }
});

// API routes
app.post('/api/generate-playlist', generatePlaylistFromGPT);
app.post('/api/create-playlist', checkAuth, async (req, res) => {
  const userId = req.session.userId;
  const db = app.locals.db;

  try {
    const result = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    const user = result.rows[0];
    if (user.playlist_count >= 50 && !user.is_subscribed) {
      return res.status(403).json({ error: 'Playlist limit reached. Please subscribe to create more playlists.' });
    }

    // Increment playlist count
    await db.query('UPDATE users SET playlist_count = playlist_count + 1 WHERE user_id = $1', [userId]);

    // Call the existing createPlaylist function
    await createPlaylist(req, res);
  } catch (error) {
    logger.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
});

// Stripe routes
app.post('/create-checkout-session', (req, res) => createCheckoutSession(req, res, app.locals.db));
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const customerId = session.customer;
      const db = app.locals.db;

      try {
        // Update the user's subscription status in the database
        await db.query('UPDATE users SET is_subscribed = TRUE WHERE email = $1', [session.customer_email]);
        logger.info(`User with email ${session.customer_email} is now subscribed.`);
      } catch (error) {
        logger.error('Error updating subscription status:', error);
      }
      break;
    // ... handle other event types
    default:
      logger.warn(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
});
app.get('/config', getConfig);

// Static routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});
app.get('/create-playlist', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create-playlist.html'));
});
app.get('/subscription-success.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscription-success.html'));
});
app.get('/subscription-cancelled.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscription-cancelled.html'));
});

app.post('/signup', async (req, res) => {
  const { email } = req.body;
  const db = app.locals.db;

  try {
    const result = await db.query(
      'INSERT INTO users (email, user_id) VALUES ($1, $2) RETURNING *',
      [email, uuidv4()]
    );

    logger.info('User signed up:', result.rows[0]);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error during sign up:', error);
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/me', async (req, res) => {
  const accessToken = req.headers.authorization?.split(' ')[1] || req.query.access_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  try {
    spotifyApi.setAccessToken(accessToken);
    const me = await spotifyApi.getMe();
    res.json(me.body);
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
});

// Implement centralized error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status
    }
  });
});

const port = process.env.PORT || 8888;

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info('Environment:', process.env.NODE_ENV);
  logger.info('Spotify Client ID:', process.env.SPOTIFY_CLIENT_ID);
  logger.info('Spotify Redirect URI:', process.env.SPOTIFY_REDIRECT_URI);
});

app.get('/tunesmith_product_demo.mp4', async (req, res) => {
  const videoPath = path.join(__dirname, 'public', 'tunesmith_product_demo.mp4');
  res.sendFile(videoPath);
});
