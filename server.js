import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cookieParser from 'cookie-parser';
import { spotifyLogin, spotifyCallback } from './routes/spotifyAuth.js';
import { chatWithOpenAI } from './routes/openAI.js';
import { createPlaylist } from './routes/createPlaylist.js';
import { getRecommendations } from './routes/recommendations.js';

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
app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);

// OpenAI chat route
app.post('/api/chat', chatWithOpenAI);

// Playlist creation route
app.post('/api/create-playlist', createPlaylist);

// Recommendations route
app.post('/api/get-recommendations', getRecommendations);

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  next();
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
