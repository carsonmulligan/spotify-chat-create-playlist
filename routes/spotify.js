import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

export const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

export const spotifyLogin = (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-modify-private',
    'playlist-modify-public',
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-top-read',
    'user-read-recently-played'
  ];
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('spotify_auth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  console.log('Redirecting to Spotify authorize URL:', authorizeURL);
  res.redirect(authorizeURL);
};

export const spotifyCallback = async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;

  if (state === null || state !== storedState) {
    return res.redirect('/#error=state_mismatch');
  }

  res.clearCookie('spotify_auth_state');

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    res.redirect(`/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    res.redirect('/#error=spotify_auth_error');
  }
};

export const refreshAccessToken = async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    spotifyApi.setRefreshToken(refresh_token);
    const data = await spotifyApi.refreshAccessToken();
    const { access_token, expires_in } = data.body;

    res.json({
      access_token: access_token,
      expires_in: expires_in
    });
  } catch (error) {
    console.error('Error refreshing access token:', error);
    res.status(500).json({ error: 'Failed to refresh access token' });
  }
};