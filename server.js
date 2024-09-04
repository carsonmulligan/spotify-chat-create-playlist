import crypto from 'crypto';
import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import path from 'path';
import querystring from 'querystring';
import SpotifyWebApi from 'spotify-web-api-node';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 8888;

app.use(express.static('public'))
   .use(cookieParser())
   .use(express.json());

const redirectUri = 'https://artur-ai-spotify-9fc02bcaa55b.herokuapp.com/callback';

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: redirectUri
});

console.log('Spotify API configuration:');
console.log('Client ID:', process.env.SPOTIFY_CLIENT_ID);
console.log('Redirect URI:', redirectUri);

const generateRandomString = length => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = 'spotify_auth_state';

app.get('/login', (req, res) => {
  try {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);

    const scope = 'playlist-modify-private playlist-modify-public';
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: redirectUri,
        state: state
      }));
  } catch (error) {
    console.error('Error in /login route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  console.log('Callback received:');
  console.log('Code:', code);
  console.log('State:', state);
  console.log('Stored State:', storedState);

  if (state === null || state !== storedState) {
    console.error('State mismatch');
    return res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
  }

  res.clearCookie(stateKey);

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    console.log('Access token retrieved');

    const { access_token, refresh_token, expires_in } = data.body;
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    res.redirect('/#' + querystring.stringify({ access_token, refresh_token }));
  } catch (error) {
    console.error('Error in callback:', error);
    res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
  }
});

app.get('/refresh_token', async (req, res) => {
  const { refresh_token } = req.query;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    spotifyApi.setRefreshToken(refresh_token);
    const data = await spotifyApi.refreshAccessToken();
    const access_token = data.body['access_token'];
    res.json({ access_token });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Add your playlist creation and other routes here

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Redirect URI: ${redirectUri}`);
});