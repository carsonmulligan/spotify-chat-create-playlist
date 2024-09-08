// File: server.js
// Description: Main server file that sets up the Express application, configures middleware,
// and defines the main routes for the Spotify AI Playlist Creator.

import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import { spotifyLogin, spotifyCallback, ensureSpotifyToken } from './routes/spotifyAuth.js';
import { generatePlaylistFromGPT } from './routes/openAI.js';
import { createPlaylist } from './routes/createPlaylist.js';
import SpotifyWebApi from 'spotify-web-api-node';

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '.env') });

// Initialize Express app
const app = express();
app.use(cookieParser()); // Parse cookies
app.use(express.json()); // Parse JSON bodies
app.use(express.static('public')); // Serve static files from 'public' directory

// Configure session middleware
app.use(session({
  secret: 'spotify-session-secret', // You can use any secret, ideally load this from .env
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' } // Ensure secure cookies in production
}));

// Logging middleware for request details
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('Cookies:', req.cookies);
  console.log('Session:', req.session);
  next();
});

// Serve the index.html on the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to handle Spotify login
app.get('/login', spotifyLogin);

// Route to handle Spotify callback after login
app.get('/callback', spotifyCallback);

// Route to generate playlist using GPT (POST request)
app.post('/api/generate-playlist', ensureSpotifyToken, generatePlaylistFromGPT);

// Route to create a playlist on Spotify with the generated recommendations
app.post('/api/create-playlist', ensureSpotifyToken, createPlaylist);

// Error handling middleware for unhandled errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred', details: err.message });
});

// This file:
// 1. Sets up the Express application and necessary middleware
// 2. Configures session management for user authentication
// 3. Defines routes for Spotify login, callback, and API endpoints
// 4. Implements error handling and logging
// 5. Starts the server and listens for incoming requests

app.get('/api/me', async (req, res) => {
  let accessToken = req.query.access_token;

  if (!accessToken || accessToken === 'null') {
    return res.status(400).json({ error: 'Access token is required' });
  }

  // Retry logic for token refresh
  const fetchUserProfile = async (retryCount = 0) => {
    try {
      spotifyApi.setAccessToken(accessToken);
      const me = await spotifyApi.getMe();
      return res.json(me.body);
    } catch (error) {
      // Check for 403 or token-related errors
      if (error.statusCode === 401 && retryCount < 2) {
        try {
          console.log('Access token expired. Attempting to refresh...');
          const refreshData = await spotifyApi.refreshAccessToken();
          accessToken = refreshData.body['access_token'];
          spotifyApi.setAccessToken(accessToken);

          console.log('New access token:', accessToken);
          return await fetchUserProfile(retryCount + 1); // Retry after refreshing the token
        } catch (refreshError) {
          console.error('Error refreshing access token:', refreshError);
          return res.status(500).json({ error: 'Failed to refresh access token', details: refreshError.message });
        }
      } else {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
      }
    }
  };

  await fetchUserProfile();
});

// Server listens on the specified port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Spotify Client ID:', process.env.SPOTIFY_CLIENT_ID);
  console.log('Spotify Redirect URI:', process.env.SPOTIFY_REDIRECT_URI);
});
