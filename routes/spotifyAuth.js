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

  console.log('Received callback from Spotify');
  console.log('Query parameters:', req.query);
  console.log('Stored state:', storedState);

  if (state === null || state !== storedState) {
    console.error('State mismatch. Received:', state, 'Stored:', storedState);
    return res.redirect('/#error=state_mismatch');
  }

  res.clearCookie('spotify_auth_state');

  try {
    console.log('Exchanging code for tokens');
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    console.log('Received tokens from Spotify');
    console.log('Access token:', access_token.substring(0, 10) + '...');
    console.log('Refresh token:', refresh_token.substring(0, 10) + '...');
    console.log('Expires in:', expires_in);

    spotifyApi.setAccessToken(access_token);

    // Fetch user profile
    const me = await spotifyApi.getMe();
    const { id: spotifyId, email, display_name } = me.body;

    // Store user in database
    const db = req.app.locals.db;
    await db.query(
      'INSERT INTO users (user_id, email, first_name) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET email = $2, first_name = $3',
      [spotifyId, email, display_name]
    );

    // Store tokens in session
    req.session.userId = spotifyId;
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.expiresIn = expires_in;

    console.log('Session after Spotify login:', req.session);

    // Redirect to the create-playlist page
    res.redirect(`${FRONTEND_URI}/create-playlist`);
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    res.redirect(`${FRONTEND_URI}/#error=spotify_auth_error`);
  }
};

export { spotifyApi };
