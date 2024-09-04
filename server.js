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
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

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
      redirect_uri: redirect_uri,
      state: state
    });
  
  console.log('Redirecting to:', authUrl);
  res.redirect(authUrl);
});

app.get('/callback', async function(req, res) {
  console.log('Callback received. Query:', req.query);
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
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

    try {
      const response = await axios.post(authOptions.url, querystring.stringify(authOptions.form), { headers: authOptions.headers });
      if (response.status === 200) {
        const { access_token, refresh_token } = response.data;
        
        // We can also pass the token to the browser to make requests from there
        res.redirect('/#' + querystring.stringify({ access_token, refresh_token }));
      } else {
        res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
      }
    } catch (error) {
      console.error('Error in /callback:', error);
      res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
    }
  }
});

app.get('/refresh_token', async function(req, res) {
  const { refresh_token } = req.query;
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
    const response = await axios.post(authOptions.url, authOptions.data, { headers: authOptions.headers });
    if (response.status === 200) {
      const { access_token } = response.data;
      res.send({ access_token });
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).send({ error: 'Failed to refresh token' });
  }
});

// Add this route to check configuration
app.get('/config', (req, res) => {
  res.json({
    clientId: client_id,
    redirectUri: redirect_uri
  });
});

const port = process.env.PORT || 8888;
app.listen(port, () => {
  console.log(`Listening on ${port}`);
  console.log(`Redirect URI: ${redirect_uri}`);
});