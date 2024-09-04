import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cookieParser from 'cookie-parser';
import { spotifyLogin, spotifyCallback } from './routes/spotifyAuth.js';
import { chatWithOpenAI } from './routes/openAI.js';
import { createPlaylist } from './routes/createPlaylist.js';
import { getRecommendations } from './routes/recommendations.js';
import path from 'path';

// Initialize environment and directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 8888;

app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());

// Root route
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'landing.html'));
});

// Spotify authentication routes
app.get('/login', (req, res) => {
  console.log('Received login request');
  spotifyLogin(req, res);
});
app.get('/callback', (req, res) => {
  console.log('Received callback request');
  spotifyCallback(req, res);
});

// OpenAI chat route
app.post('/api/chat', chatWithOpenAI);

// Playlist creation route
app.post('/api/create-playlist', createPlaylist);

// Recommendations route
app.post('/api/get-recommendations', getRecommendations);

// New route to handle frontend redirect
app.get('/auth-success', (req, res) => {
  console.log('Received auth-success request');
  const { access_token, refresh_token, expires_in } = req.query;
  console.log('Tokens received:', { access_token, refresh_token, expires_in });
  res.sendFile(path.join(__dirname, 'public', 'auth-success.html'));
});

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  next();
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
