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
  res.cookie('spotify_auth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  const scopes = ['playlist-modify-private', 'playlist-modify-public', 'user-read-private', 'user-read-email'];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  
  console.log('Redirecting to Spotify authorize URL:', authorizeURL);
  res.redirect(authorizeURL);
};

// Callback after Spotify login
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

    console.log('Received tokens from Spotify:');
    console.log('Access token:', access_token.substring(0, 10) + '...');
    console.log('Refresh token:', refresh_token.substring(0, 10) + '...');
    console.log('Expires in:', expires_in);

    // Set tokens on Spotify API instance
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    // Store tokens in session (or database for scalability)
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.expiresAt = Date.now() + expires_in * 1000;  // Token expiration time in milliseconds

    // Redirect back to frontend
    const redirectURL = `${process.env.FRONTEND_URI || 'http://localhost:3000'}/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`;
    res.redirect(redirectURL);
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    res.redirect(`${process.env.FRONTEND_URI || 'http://localhost:3000'}/#error=spotify_auth_error&message=${encodeURIComponent(error.message)}`);
  }
};

// Middleware for checking token expiration and refreshing if necessary
export const ensureSpotifyToken = async (req, res, next) => {
  const { accessToken, refreshToken, expiresAt } = req.session;

  // Check if the access token is expired
  if (Date.now() > expiresAt) {
    console.log('Access token expired. Refreshing token...');

    try {
      // Refresh the access token using the refresh token
      const data = await spotifyApi.refreshAccessToken();
      const newAccessToken = data.body['access_token'];
      const expiresIn = data.body['expires_in'];

      // Update session with new access token and expiration time
      req.session.accessToken = newAccessToken;
      req.session.expiresAt = Date.now() + expiresIn * 1000;  // New expiration time

      // Set new access token on Spotify API instance
      spotifyApi.setAccessToken(newAccessToken);

      console.log('New access token received:', newAccessToken.substring(0, 10) + '...');
      next();  // Proceed to the next middleware
    } catch (error) {
      console.error('Error refreshing access token:', error);
      res.status(500).json({ error: 'Failed to refresh access token', details: error.message });
    }
  } else {
    // Token is still valid, proceed to the next middleware
    spotifyApi.setAccessToken(accessToken);  // Ensure the current access token is set
    next();
  }
};

export { spotifyApi };
