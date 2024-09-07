import dotenv from 'dotenv';
import SpotifyWebApi from 'spotify-web-api-node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const port = 3000;

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

app.get('/login', (req, res) => {
  const scopes = ['user-read-private', 'playlist-read-private', 'playlist-modify-public', 'playlist-modify-private'];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
  console.log('Redirecting to:', authorizeURL);
  res.redirect(authorizeURL);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;

  if (error) {
    console.error('Error during Spotify authorization:', error);
    return res.status(400).send(`Authorization error: ${error}`);
  }

  if (!code) {
    console.error('No code provided in callback');
    return res.status(400).send('No authorization code provided');
  }
  
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);

    // Optionally save these tokens for future use
    console.log('Access Token:', data.body['access_token']);
    console.log('Refresh Token:', data.body['refresh_token']);

    // Now you can use the access token to make API calls on behalf of the user
    const me = await spotifyApi.getMe();
    console.log('User Info:', me.body);

    // Respond to the user
    res.send('You are now authenticated with Spotify!');
  } catch (error) {
    console.error('Error in callback:', error);
    res.status(500).send('Error during authentication: ' + error.message);
  }
});

// Add a catch-all route for 404 errors
app.use((req, res) => {
  console.error('404 Not Found:', req.url);
  res.status(404).send('404 Not Found');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Login URL:', `http://localhost:${port}/login`);
});
