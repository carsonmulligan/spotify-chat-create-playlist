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

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

let refreshToken = null;

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Spotify authentication route
app.get('/login', (req, res) => {
  const scopes = ['user-read-private', 'user-read-email', 'playlist-modify-public', 'playlist-modify-private'];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
  res.redirect(authorizeURL);
});

// Spotify callback route
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
    refreshToken = refresh_token; // Store the refresh token
    res.redirect('/'); // Redirect to the main page after successful authentication
  } catch (error) {
    console.error('Error in Spotify callback:', error);
    res.status(500).send('Authentication failed');
  }
});

setupSpotifyRoutes(app);
app.post('/api/create-playlist', createPlaylist);

// Add this function to refresh the access token
async function refreshAccessToken() {
  if (!refreshToken) {
    console.log('No refresh token available. Please authenticate first.');
    return;
  }
  try {
    spotifyApi.setRefreshToken(refreshToken);
    const data = await spotifyApi.refreshAccessToken();
    const { access_token } = data.body;
    console.log('The access token has been refreshed!');
    spotifyApi.setAccessToken(access_token);
  } catch (err) {
    console.log('Could not refresh access token', err);
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Export spotifyApi and refreshAccessToken for use in other modules
export { spotifyApi, refreshAccessToken };
