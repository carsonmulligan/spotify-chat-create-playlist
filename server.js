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

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
app.use(cookieParser());  // Ensure cookie parsing
app.use(express.json());
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('Cookies:', req.cookies);
  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);
app.post('/api/generate-playlist', generatePlaylistFromGPT);
app.post('/api/create-playlist', createPlaylist);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred', details: err.message });
});

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



const port = process.env.PORT || 8888;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Spotify Client ID:', process.env.SPOTIFY_CLIENT_ID);
  console.log('Spotify Redirect URI:', process.env.SPOTIFY_REDIRECT_URI);
});
