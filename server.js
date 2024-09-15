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
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

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

// SQLite database initialization
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

// Update the root route to serve the landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Add a route for the create-playlist page
app.get('/create-playlist', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create-playlist.html'));
});

// Update the callback route to redirect to the create-playlist page
app.get('/callback', spotifyCallback);

// Add this route to check if the user is authenticated
app.get('/check-auth', (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// Routes
app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);
app.post('/api/generate-playlist', generatePlaylistFromGPT);
app.post('/api/create-playlist', async (req, res) => {
  const userId = req.session.userId;
  const db = app.locals.db;

  try {
    const user = await db.get('SELECT * FROM users WHERE user_id = ?', userId);
    if (user.playlist_count >= 3 && !user.is_subscribed) {
      return res.status(403).json({ error: 'Playlist limit reached. Please subscribe to create more playlists.' });
    }

    // Increment playlist count
    await db.run('UPDATE users SET playlist_count = playlist_count + 1 WHERE user_id = ?', userId);

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

// Update the signup route
app.post('/signup', async (req, res) => {
  const { email } = req.body;
  const db = app.locals.db;

  try {
    // Save to SQLite database
    const result = await db.run(
      'INSERT INTO users (email, user_id) VALUES (?, ?)',
      [email, uuidv4()]
    );

    console.log('User signed up:', result);
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

// Add this route before your other routes
app.get('/tunesmith_product_demo.mp4', async (req, res) => {
  const path = 'public/tunesmith_product_demo.mp4';
  const stat = await fs.promises.stat(path);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
    const chunksize = (end-start)+1;
    const file = fs.createReadStream(path, {start, end});
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(path).pipe(res);
  }
});
