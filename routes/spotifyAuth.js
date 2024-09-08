// File: spotifyAuth.js
// Description: Handles Spotify authentication and token management 

import SpotifyWebApi from 'spotify-web-api-node';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// Login with Spotify
export const spotifyLogin = (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.spotifyAuthState = state;
  const scopes = ['user-read-private', 'user-read-email', 'playlist-modify-private', 'playlist-modify-public'];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  res.redirect(authorizeURL);
};

// Callback after Spotify login
export const spotifyCallback = async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.session.spotifyAuthState;

  if (state === null || state !== storedState) {
    console.error('State mismatch. Received:', state, 'Stored:', storedState);
    return res.redirect('/#error=state_mismatch');
  }

  delete req.session.spotifyAuthState;

  try {
    console.log('Exchanging code for tokens');
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    console.log('Received tokens from Spotify');
    console.log('Access token:', access_token.substring(0, 10) + '...');
    console.log('Refresh token:', refresh_token.substring(0, 10) + '...');
    console.log('Expires in:', expires_in);

    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.expiresAt = Date.now() + expires_in * 1000;

    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    res.redirect(`${process.env.FRONTEND_URI || 'http://localhost:3000'}/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    res.redirect(`${process.env.FRONTEND_URI || 'http://localhost:3000'}/#error=spotify_auth_error&message=${encodeURIComponent(error.message)}`);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  if (!req.session.refreshToken) {
    return res.status(401).json({ error: 'No refresh token available' });
  }

  try {
    spotifyApi.setRefreshToken(req.session.refreshToken);
    const data = await spotifyApi.refreshAccessToken();
    const { access_token, expires_in } = data.body;

    req.session.accessToken = access_token;
    req.session.expiresAt = Date.now() + expires_in * 1000;

    next();
  } catch (error) {
    console.error('Error refreshing access token:', error);
    res.status(401).json({ error: 'Failed to refresh access token' });
  }
};

export const ensureAuthenticated = (req, res, next) => {
  console.log('Checking authentication');
  console.log('Session access token:', req.session.accessToken ? 'Set' : 'Not set');
  console.log('Session expires at:', new Date(req.session.expiresAt));
  console.log('Current time:', new Date());

  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (Date.now() > req.session.expiresAt) {
    console.log('Token expired, refreshing');
    return refreshAccessToken(req, res, next);
  }

  console.log('Setting access token for Spotify API');
  spotifyApi.setAccessToken(req.session.accessToken);
  next();
};

export { spotifyApi };

