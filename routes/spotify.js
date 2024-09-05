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
  const scopes = ['user-read-private', 'user-read-email', 'playlist-modify-private', 'playlist-modify-public'];
  const state = generateRandomString(16);
  res.cookie('spotify_auth_state', state);
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

    console.log('Access Token:', access_token);
    console.log('Refresh Token:', refresh_token);
    console.log('Expires in:', expires_in);

    res.redirect(`${process.env.FRONTEND_URI}/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
  } catch (error) {
    console.error('Error in callback:', error);
    res.redirect('/#error=invalid_token');
  }
};

export const refreshAccessToken = async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    console.log('Refreshing access token with refresh token:', refresh_token.substring(0, 10) + '...');
    spotifyApi.setRefreshToken(refresh_token);
    const data = await spotifyApi.refreshAccessToken();
    const { access_token, expires_in } = data.body;

    console.log('New access token received:', access_token.substring(0, 10) + '...');
    console.log('Token expires in:', expires_in);

    // Set the access token on the API object
    spotifyApi.setAccessToken(access_token);

    res.json({
      access_token: access_token,
      expires_in: expires_in
    });
  } catch (error) {
    console.error('Error refreshing access token:', error);
    console.error('Error details:', error.response ? error.response.body : 'No response body');
    res.status(500).json({ error: 'Failed to refresh access token' });
  }
};

// Add this function at the end of the file
function generateRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}