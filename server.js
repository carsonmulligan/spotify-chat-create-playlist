import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import { spotifyLogin, spotifyCallback, spotifyApi, refreshAccessToken } from './routes/spotify.js';
import { chat } from './routes/openAI.js';
import { createPlaylist } from './routes/playlist.js';
import { getRecommendations } from './routes/recommendations.js';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
app.use(cookieParser());
app.use(express.json());  // Add this line to parse JSON bodies
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
app.post('/api/chat', chat);
app.post('/api/create-playlist', createPlaylist);
app.post('/api/get-recommendations', getRecommendations);
app.post('/refresh_token', refreshAccessToken);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred', details: err.message });
});

app.get('/api/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const accessToken = authHeader.split(' ')[1];

  try {
    spotifyApi.setAccessToken(accessToken);
    const me = await spotifyApi.getMe();
    console.log('User profile fetched successfully:', me.body);
    res.json(me.body);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    console.error('Error details:', error.body);
    if (error.statusCode === 401) {
      res.status(401).json({ error: 'Invalid or expired token' });
    } else if (error.statusCode === 403) {
      res.status(403).json({ error: 'Forbidden. Check app permissions and scopes.', details: error.body });
    } else {
      res.status(500).json({ error: 'Failed to fetch user profile', details: error.body });
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Spotify Client ID:', process.env.SPOTIFY_CLIENT_ID);
  console.log('Spotify Redirect URI:', process.env.SPOTIFY_REDIRECT_URI);
});