import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spotifyLogin, spotifyCallback, createPlaylist } from './routes/spotify.js';
import { generatePlaylistFromAI } from './routes/openAI.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Serve index.html for the app
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Spotify login and callback routes
app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);

// API route to generate playlist via OpenAI and Spotify
app.post('/api/create-playlist', createPlaylist);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).send('Internal server error');
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
