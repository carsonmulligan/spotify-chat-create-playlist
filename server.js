import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import querystring from 'querystring';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI || 'https://artur-ai-spotify-9fc02bcaa55b.herokuapp.com/callback';

console.log('Starting server with configuration:');
console.log('Client ID:', client_id);
console.log('Redirect URI:', redirect_uri);

const app = express();

app.use(express.static(path.join(__dirname, 'public')))
   .use(cors())
   .use(cookieParser());

const generateRandomString = (length) => {
  return crypto.randomBytes(60).toString('hex').slice(0, length);
};

const stateKey = 'spotify_auth_state';

app.get('/login', function(req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  const scope = 'playlist-modify-private playlist-modify-public';
  const authUrl = 'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: encodeURIComponent(redirect_uri),
      state: state
    });

  console.log('Login request received. Redirecting to:', authUrl);
  res.redirect(authUrl);
});

app.get('/callback', async function(req, res) {
  console.log('Callback received. Query:', req.query);
  console.log('Cookies:', req.cookies);
  console.log('State Key:', stateKey);

  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    console.log('State mismatch. Stored state:', storedState, 'Received state:', state);
    res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
  } else {
    res.clearCookie(stateKey);
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      json: true
    };

    console.log('Requesting access token with options:', JSON.stringify(authOptions, null, 2));

    try {
      const response = await axios.post(authOptions.url, querystring.stringify(authOptions.form), { headers: authOptions.headers });
      console.log('Token response status:', response.status);
      console.log('Token response data:', response.data);

      if (response.status === 200) {
        const { access_token, refresh_token } = response.data;
        
        const redirectUrl = '/#' + querystring.stringify({ access_token, refresh_token });
        console.log('Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
      } else {
        console.log('Invalid token response');
        res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
      }
    } catch (error) {
      console.error('Error in /callback:', error.response ? error.response.data : error.message);
      res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
    }
  }
});

app.get('/refresh_token', async function(req, res) {
  const { refresh_token } = req.query;
  console.log('Refresh token request received:', refresh_token);

  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 
      'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    })
  };

  try {
    console.log('Requesting new access token');
    const response = await axios.post(authOptions.url, authOptions.data, { headers: authOptions.headers });
    console.log('Refresh token response:', response.status, response.data);

    if (response.status === 200) {
      const { access_token } = response.data;
      res.send({ access_token });
    }
  } catch (error) {
    console.error('Error refreshing token:', error.response ? error.response.data : error.message);
    res.status(500).send({ error: 'Failed to refresh token' });
  }
});

// Add this route to check configuration
app.get('/config', (req, res) => {
  console.log('Config request received');
  res.json({
    clientId: client_id,
    redirectUri: redirect_uri
  });
});

// Add this route to check environment variables
app.get('/env', (req, res) => {
  console.log('Environment variables request received');
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI
  });
});

app.get('/check-config', (req, res) => {
  res.json({
    clientId: client_id,
    redirectUri: redirect_uri,
    fullRedirectUri: encodeURIComponent(redirect_uri)
  });
});

const port = process.env.PORT || 8888;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
  console.log(`Redirect URI: ${redirect_uri}`);
});