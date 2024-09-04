import { spotifyApi } from './openAI.js';

export const spotifyLogin = (req, res) => {
  const scopes = ['playlist-modify-private', 'playlist-modify-public'];
  const state = generateRandomString(16);
  res.cookie('spotify_auth_state', state);
  res.redirect(spotifyApi.createAuthorizeURL(scopes, state));
};

export const spotifyCallback = async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;

  if (!state || state !== storedState) {
    console.error('State mismatch in Spotify callback');
    return res.redirect('/#error=state_mismatch');
  }

  res.clearCookie('spotify_auth_state');

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    // Set the access token and refresh token on the API object
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    res.cookie('spotify_access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expires_in * 1000
    });

    res.cookie('spotify_refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    res.redirect(process.env.FRONTEND_URI || 'http://localhost:3000');
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
