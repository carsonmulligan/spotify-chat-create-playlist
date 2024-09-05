import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import { spotifyLogin, spotifyCallback } from './routes/spotify.js';
import { chat } from './routes/openAI.js';
import { createPlaylist } from './routes/playlist.js';
import { getRecommendations } from './routes/recommendations.js';
import cookieParser from 'cookie-parser';

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
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get('/login', (req, res) => {
  console.log('Initiating Spotify login');
  spotifyLogin(req, res);
});

app.get('/callback', (req, res) => {
  console.log('Received Spotify callback');
  spotifyCallback(req, res);
});

app.post('/api/chat', chat);
app.post('/api/create-playlist', createPlaylist);
app.post('/api/get-recommendations', getRecommendations);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred', details: err.message });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Spotify Client ID:', process.env.SPOTIFY_CLIENT_ID);
  console.log('Spotify Redirect URI:', process.env.SPOTIFY_REDIRECT_URI);
});
