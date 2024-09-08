import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import { spotifyLogin, spotifyCallback } from './routes/spotifyAuth.js';
import { generatePlaylistFromGPT, chat, spotifyApi } from './routes/openAI.js';
import { createPlaylist } from './routes/createPlaylist.js';
import cookieParser from 'cookie-parser';

// User Journey:
// 1. User visits the homepage
// 2. User clicks "Login with Spotify" and is redirected to Spotify login
// 3. After successful login, user is redirected back to the app
// 4. User enters a prompt for playlist creation
// 5. App uses OpenAI to generate song recommendations
// 6. App creates a playlist on user's Spotify account with the recommended songs

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
app.use(cookieParser());
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('Cookies:', req.cookies);
  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);
app.post('/api/generate-playlist', generatePlaylistFromGPT);
app.post('/api/create-playlist', createPlaylist);
app.post('/api/chat', chat);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred', details: err.message });
});

app.get('/api/me', async (req, res) => {
  const accessToken = req.query.access_token;
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Spotify Client ID:', process.env.SPOTIFY_CLIENT_ID);
  console.log('Spotify Redirect URI:', process.env.SPOTIFY_REDIRECT_URI);
});