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

export const spotifyLogin = (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('spotify_auth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  const scopes = ['playlist-modify-private', 'playlist-modify-public'];
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

    // Set the access token on the API object
    spotifyApi.setAccessToken(access_token);

    const redirectURL = `${process.env.FRONTEND_URI || 'http://localhost:3000'}/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`;
    
    console.log('Redirecting to:', redirectURL);
    res.redirect(redirectURL);
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    res.redirect(`${process.env.FRONTEND_URI || 'http://localhost:3000'}/#error=spotify_auth_error&message=${encodeURIComponent(error.message)}`);
  }
};

export { spotifyApi };