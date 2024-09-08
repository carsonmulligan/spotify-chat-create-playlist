import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import { spotifyLogin, spotifyCallback } from './routes/spotifyAuth.js';
import { generatePlaylistFromGPT } from './routes/openAI.js';
import { createPlaylist } from './routes/createPlaylist.js';
import cookieParser from 'cookie-parser';
import SpotifyWebApi from 'spotify-web-api-node';

// User Journey:
// 1. User visits the homepage
// 2. User clicks "Login with Spotify" and is redirected to Spotify login
// 3. After successful login, user is redirected back to the app
// 4. User enters a prompt for playlist creation
// 5. App uses OpenAI to generate song recommendations
// 6. App creates a playlist on user's Spotify account with the recommended songs

// Spotify Web API instance
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// File and directory handling
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '.env') });

// Initialize Express app
const app = express();
app.use(cookieParser()); // Parse cookies
app.use(express.json()); // Parse JSON bodies
app.use(express.static('public')); // Serve static files from 'public' directory

// Logging middleware for request details
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('Cookies:', req.cookies);
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
app.post('/api/generate-playlist', generatePlaylistFromGPT);

// Route to create a playlist on Spotify with the generated recommendations
app.post('/api/create-playlist', createPlaylist);

// Error handling middleware for unhandled errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred', details: err.message });
});

// Route to fetch user profile information from Spotify using access token
app.get('/api/me', async (req, res) => {
  let accessToken = req.query.access_token;

  if (!accessToken || accessToken === 'null') {
    return res.status(400).json({ error: 'Access token is required' });
  }

  // Function to fetch user profile, with retry logic for token refresh
  const fetchUserProfile = async (retryCount = 0) => {
    try {
      spotifyApi.setAccessToken(accessToken);
      const me = await spotifyApi.getMe();
      return res.json(me.body);
    } catch (error) {
      // Handle token expiration
      if (error.statusCode === 401 && retryCount < 2) {
        try {
          console.log('Access token expired. Attempting to refresh...');
          const refreshData = await spotifyApi.refreshAccessToken();
          accessToken = refreshData.body['access_token'];
          spotifyApi.setAccessToken(accessToken);

          console.log('New access token:', accessToken);
          return await fetchUserProfile(retryCount + 1); // Retry after token refresh
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
