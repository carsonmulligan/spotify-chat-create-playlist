import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import { spotifyLogin, spotifyCallback, refreshAccessToken } from './routes/spotify.js';
import { chat } from './routes/openAI.js';
import { createPlaylist } from './routes/playlist.js';
import { getRecommendations } from './routes/recommendations.js';
import cookieParser from 'cookie-parser';
import http from 'http';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());

app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);
app.post('/refresh_token', refreshAccessToken);
app.post('/api/chat', chat);
app.post('/api/create-playlist', createPlaylist);
app.get('/api/recommendations', getRecommendations);

app.get('/api/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const accessToken = authHeader.split(' ')[1];

  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
  res.redirect('/');
});

const server = http.createServer(app);
server.timeout = 300000; // 5 minutes

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
