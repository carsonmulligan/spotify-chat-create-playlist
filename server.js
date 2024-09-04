import OpenAI from "openai";
import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import querystring from 'querystring';
import axios from 'axios';
import SpotifyWebApi from 'spotify-web-api-node';
import path from 'path';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 8888;

app.use(express.static('public'))
   .use(cookieParser())
   .use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: 'https://artur-ai-spotify-9fc02bcaa55b.herokuapp.com/callback'
});

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length}, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
};

const stateKey = 'spotify_auth_state';

app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  const scopes = ['playlist-modify-private', 'playlist-modify-public'];
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scopes.join(' '),
      redirect_uri: 'https://artur-ai-spotify-9fc02bcaa55b.herokuapp.com/callback',
      state: state
    }));
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
    return;
  }

  res.clearCookie(stateKey);

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    // Set up token refresh
    setInterval(async () => {
      const data = await spotifyApi.refreshAccessToken();
      const access_token = data.body['access_token'];
      console.log('Access token refreshed');
      spotifyApi.setAccessToken(access_token);
    }, expires_in / 2 * 1000);

    res.redirect('/#' + querystring.stringify({ access_token, refresh_token }));
  } catch (error) {
    console.error('Error in /callback:', error);
    res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
  }
});

// Keep your existing routes for playlist creation and other functionality

app.listen(port, () => {
  console.log(`Server running at ${process.env.SPOTIFY_REDIRECT_URI}`);
});