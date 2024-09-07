import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupSpotifyRoutes } from './routes/spotify.js';
import { createPlaylist } from './routes/playlist.js';
import SpotifyWebApi from 'spotify-web-api-node';

dotenv.config();

console.log('Environment variables:');
console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID);
console.log('SPOTIFY_REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

setupSpotifyRoutes(app);
app.post('/api/create-playlist', createPlaylist);

// Add this function to refresh the access token
async function refreshAccessToken() {
  try {
    const data = await spotifyApi.refreshAccessToken();
    const access_token = data.body['access_token'];
    console.log('The access token has been refreshed!');
    spotifyApi.setAccessToken(access_token);
  } catch (err) {
    console.log('Could not refresh access token', err);
  }
}

// Call this function before making API requests
await refreshAccessToken();

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
