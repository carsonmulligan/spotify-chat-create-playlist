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
const port = process.env.PORT || 3000;  // Change 8888 to 3000 or any other available port

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);
app.post('/api/chat', chat);
app.post('/api/create-playlist', createPlaylist);
app.post('/api/get-recommendations', getRecommendations);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  next();
});
