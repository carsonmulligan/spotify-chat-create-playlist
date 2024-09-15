import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_URI = isProduction ? 'https://www.tunesmith-ai.com' : 'http://localhost:8888';

export const spotifyLogin = (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('spotify_auth_state', state, { httpOnly: true, secure: isProduction });
  const scopes = ['user-read-private', 'user-read-email', 'playlist-modify-private', 'playlist-modify-public'];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  console.log('Redirecting to Spotify authorize URL:', authorizeURL);
  res.redirect(authorizeURL);
};

export const spotifyCallback = async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;

  if (state === null || state !== storedState) {
    console.error('State mismatch in Spotify callback.');
    return res.redirect('/#error=state_mismatch');
  }

  try {
    console.log('Attempting to exchange authorization code for tokens');
    const data = await spotifyApi.authorizationCodeGrant(code);
    console.log('Token exchange successful:', data.body);

    const { access_token, refresh_token, expires_in } = data.body;

    // Set the access token on the API object
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    // Store tokens in session
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.tokenExpirationTime = Date.now() + expires_in * 1000;

    console.log('Fetching user profile');
    const me = await spotifyApi.getMe();
    console.log('User profile fetched:', me.body);

    req.session.userId = me.body.id;

    console.log('Session after Spotify login:', req.session);

    // Redirect to the create playlist page
    res.redirect('/create-playlist');
  } catch (error) {
    console.error('Error during Spotify callback:', error);
    console.error('Error details:', error.body);
    res.redirect('/#error=spotify_auth_error');
  }
};

export { spotifyApi };

export const refreshAccessToken = async (req, res, next) => {
  if (!req.session.refreshToken) {
    return next();
  }

  const expirationTime = req.session.tokenExpirationTime;
  if (!expirationTime || Date.now() > expirationTime) {
    try {
      spotifyApi.setRefreshToken(req.session.refreshToken);
      const data = await spotifyApi.refreshAccessToken();
      const { access_token, expires_in } = data.body;

      req.session.accessToken = access_token;
      req.session.tokenExpirationTime = Date.now() + expires_in * 1000;

      spotifyApi.setAccessToken(access_token);
    } catch (error) {
      console.error('Error refreshing access token', error);
      return res.status(401).json({ error: 'Failed to refresh access token' });
    }
  }
  next();
};
