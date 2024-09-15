// server.js
import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import cookieParser from 'cookie-parser';
import Stripe from 'stripe';
import pg from 'pg';

// Import routes
import { spotifyLogin, spotifyCallback } from './routes/spotifyAuth.js';
import { generatePlaylistFromGPT } from './routes/openAI.js';
import { createPlaylist } from './routes/createPlaylist.js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware to get user ID from access token
app.use(async (req, res, next) => {
  const accessToken = req.headers.authorization?.split(' ')[1] || req.query.access_token;
  if (accessToken) {
    try {
      const userId = await getUserIdFromAccessToken(accessToken);
      req.userId = userId;
      req.accessToken = accessToken;
    } catch (err) {
      console.error('Error fetching user ID:', err);
    }
  }
  next();
});

// Function to get user ID from Spotify access token
async function getUserIdFromAccessToken(accessToken) {
  const SpotifyWebApi = (await import('spotify-web-api-node')).default;
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  const data = await spotifyApi.getMe();
  return data.body.id;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);
app.post('/api/generate-playlist', generatePlaylistFromGPT);
app.post('/api/create-playlist', (req, res) => createPlaylist(req, res, pool, stripe));

// Stripe routes
app.post('/create-checkout-session', async (req, res) => {
  // Your existing code for creating a checkout session
});

app.get('/checkout-session', async (req, res) => {
  // Your existing code for retrieving a checkout session
});

app.post('/subscribe', async (req, res) => {
  // Update subscription status in the database
  const userId = req.userId;
  if (userId) {
    try {
      await pool.query('UPDATE users SET is_subscribed = TRUE WHERE user_id = $1', [userId]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating subscription status:', error);
      res.status(500).json({ error: 'Failed to update subscription status' });
    }
  } else {
    res.status(401).json({ error: 'User not authenticated' });
  }
});

app.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred', details: err.message });
});

const port = process.env.PORT || 8888;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
