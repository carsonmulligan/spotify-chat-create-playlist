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

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
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

// PostgreSQL database initialization
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'
  }
});
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

app.locals.db = {
  query: (text, params) => pool.query(text, params),
};

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database', err);
  } else {
    console.log('Successfully connected to the database');
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
    console.log('Users table created or already exists');
  } catch (error) {
    console.error('Error creating users table:', error);
  }
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

app.get('/create-playlist', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create-playlist.html'));
});

app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);
app.post('/api/generate-playlist', generatePlaylistFromGPT);
app.post('/api/create-playlist', async (req, res) => {
  const userId = req.session.userId;
  const db = app.locals.db;

  try {
    const result = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    const user = result.rows[0];
    if (user.playlist_count >= 3 && !user.is_subscribed) {
      return res.status(403).json({ error: 'Playlist limit reached. Please subscribe to create more playlists.' });
    }

    // Increment playlist count
    await db.query('UPDATE users SET playlist_count = playlist_count + 1 WHERE user_id = $1', [userId]);

    // Call the existing createPlaylist function
    await createPlaylist(req, res);
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
});

// Stripe routes
app.post('/create-checkout-session', (req, res) => createCheckoutSession(req, res, app.locals.db));
app.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);
app.get('/config', getConfig);

app.post('/signup', async (req, res) => {
  const { email } = req.body;
  const db = app.locals.db;

  try {
    const result = await db.query(
      'INSERT INTO users (email, user_id) VALUES ($1, $2) RETURNING *',
      [email, uuidv4()]
    );

    console.log('User signed up:', result.rows[0]);
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
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: isProduction ? 'https://www.tunesmith-ai.com' : 'http://localhost:8888',
  credentials: true
}));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Spotify Client ID:', process.env.SPOTIFY_CLIENT_ID);
  console.log('Spotify Redirect URI:', process.env.SPOTIFY_REDIRECT_URI);
});

app.get('/subscription-success.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscription-success.html'));
});

app.get('/subscription-cancelled.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscription-cancelled.html'));
});

app.get('/tunesmith_product_demo.mp4', async (req, res) => {
  const videoPath = path.join(__dirname, 'public', 'tunesmith_product_demo.mp4');
  res.sendFile(videoPath);
});

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; frame-src https://js.stripe.com;"
  );
  next();
});

app.get('/check-auth', (req, res) => {
  res.json({ authenticated: !!req.session.userId });
});
