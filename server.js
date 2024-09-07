// server.js

import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupSpotifyRoutes } from './routes/spotify.js';
import { createPlaylist } from './routes/playlist.js';
import SpotifyWebApi from 'spotify-web-api-node';

// Load environment variables
dotenv.config();

// Log important environment variables for debugging
console.log('Environment variables:');
console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID);
console.log('SPOTIFY_REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI);

// Set up file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Store refresh token in memory (Note: In production, use a secure database)
let refreshToken = null;

// Middleware setup
app.use(express.static('public'));
app.use(express.json());

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Step 1: User initiates Spotify login
app.get('/login', (req, res) => {
  const scopes = ['user-read-private', 'user-read-email', 'playlist-modify-public', 'playlist-modify-private'];
  const state = Math.random().toString(36).substring(2, 15);
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  res.redirect(authorizeURL);
});

// Step 2: Handle Spotify callback after user grants permission
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
    refreshToken = refresh_token; // Store the refresh token
    
    // Redirect to the frontend with the tokens
    res.redirect(`${process.env.FRONTEND_URI}#access_token=${access_token}&refresh_token=${refresh_token}`);
  } catch (error) {
    console.error('Error in Spotify callback:', error);
    res.redirect(`${process.env.FRONTEND_URI}#error=authentication_failed`);
  }
});

// Set up Spotify routes
setupSpotifyRoutes(app);

// Step 3: Handle playlist creation request
app.post('/api/create-playlist', createPlaylist);

// Function to refresh the access token when needed
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
