import { spotifyApi } from './openAI.js';

export const spotifyLogin = (req, res) => {
  const scopes = ['playlist-modify-private', 'playlist-modify-public'];
  const state = generateRandomString(16);
  res.cookie('spotify_auth_state', state);
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  console.log('Redirecting to Spotify authorize URL:', authorizeURL);
  res.redirect(authorizeURL);
};

export const spotifyCallback = async (req, res) => {
  console.log('Received callback from Spotify');
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;

  if (!state || state !== storedState) {
    console.error('State mismatch in Spotify callback');
    return res.redirect('/#error=state_mismatch');
  }

  res.clearCookie('spotify_auth_state');

  try {
    console.log('Exchanging code for tokens');
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    console.log('Received tokens from Spotify');
    // Set the access token and refresh token on the API object
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    // Redirect to the auth-success page with tokens as query parameters
    const redirectURL = `/auth-success?access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}&expires_in=${expires_in}`;
    console.log('Redirecting to:', redirectURL);
    res.redirect(redirectURL);
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    res.redirect('/#error=spotify_auth_error');
  }
};

function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}