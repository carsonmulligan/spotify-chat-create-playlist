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
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import session from 'express-session';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('Cookies:', req.cookies);
  next();
});

// Initialize the database
(async () => {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
  app.locals.db = db;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      first_name VARCHAR(255),
      playlist_count INTEGER NOT NULL DEFAULT 0,
      is_subscribed BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);
})();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);
app.post('/api/generate-playlist', generatePlaylistFromGPT);
app.post('/api/create-playlist', createPlaylist);

// Stripe routes
app.post('/create-checkout-session', (req, res) => createCheckoutSession(req, res, app.locals.db));
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => handleWebhook(req, res, app.locals.db));
app.get('/config', getConfig);

app.post('/signup', async (req, res) => {
  const { firstName, email } = req.body;
  const db = app.locals.db;

  try {
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.json({ success: false, error: 'User already exists' });
    }

    const userId = uuidv4();
    await db.run('INSERT INTO users (user_id, email, first_name) VALUES (?, ?, ?)', [userId, email, firstName]);
    req.session.userId = userId;
    res.json({ success: true });
  } catch (error) {
    console.error('Error during sign up:', error);
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
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred', details: err.message });
});

const port = process.env.PORT || 8888;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Spotify Client ID:', process.env.SPOTIFY_CLIENT_ID);
  console.log('Spotify Redirect URI:', process.env.SPOTIFY_REDIRECT_URI);
});

// Add these routes
app.get('/subscription-success.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscription-success.html'));
});

app.get('/subscription-cancelled.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscription-cancelled.html'));
});
