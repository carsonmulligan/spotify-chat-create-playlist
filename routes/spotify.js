// routes/spotify.js

import SpotifyWebApi from 'spotify-web-api-node';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

console.log('Spotify API initialized with:');
console.log('Client ID:', process.env.SPOTIFY_CLIENT_ID ? 'Set' : 'Not set');
console.log('Client Secret:', process.env.SPOTIFY_CLIENT_SECRET ? 'Set' : 'Not set');
console.log('Redirect URI:', process.env.SPOTIFY_REDIRECT_URI);

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

  console.log('Received state:', state);
  console.log('Stored state:', storedState);

  if (state === null || state !== storedState) {
    console.error('State mismatch in Spotify callback');
    return res.redirect('/#error=state_mismatch');
  }

  res.clearCookie('spotify_auth_state');

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    // Get the user's Spotify ID
    spotifyApi.setAccessToken(access_token);
    const me = await spotifyApi.getMe();
    const userId = me.body.id;

    // Send tokens and user ID to the client
    res.redirect(`/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}&user_id=${userId}`);
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    res.redirect('/#error=spotify_auth_error');
  }
};

export const refreshAccessToken = async (refreshToken) => {
  try {
    console.log('Attempting to refresh access token...');
    spotifyApi.setRefreshToken(refreshToken);
    const data = await spotifyApi.refreshAccessToken();
    console.log('The access token has been refreshed!');
    return data.body['access_token'];
  } catch (error) {
    console.error('Could not refresh access token', error);
    throw error;
  }
};

export { spotifyApi };