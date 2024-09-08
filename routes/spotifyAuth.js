import { spotifyApi } from './openAI.js';
import crypto from 'crypto';

export const spotifyLogin = (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('spotify_auth_state', state);
  const scopes = ['playlist-modify-private', 'playlist-modify-public'];
  res.redirect(spotifyApi.createAuthorizeURL(scopes, state));
};

export const spotifyCallback = async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;

  if (state === null || state !== storedState) {
    console.error('State mismatch in Spotify callback');
    return res.redirect('/#error=state_mismatch');
  }

  res.clearCookie('spotify_auth_state');

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    // Instead of setting cookies, we'll redirect with the tokens in the URL
    const redirectURL = `${process.env.SPOTIFY_FRONTEND_URI || 'http://localhost:3000'}/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`;
    
    console.log('Redirecting to:', redirectURL);
    res.redirect(redirectURL);
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    res.redirect(`${process.env.SPOTIFY_FRONTEND_URI || 'http://localhost:3000'}/#error=spotify_auth_error`);
  }
};