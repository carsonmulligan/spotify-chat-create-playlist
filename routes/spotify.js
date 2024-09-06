import SpotifyWebApi from 'spotify-web-api-node';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.NODE_ENV === 'production' 
    ? process.env.SPOTIFY_REDIRECT_URI 
    : 'http://localhost:3000/callback',
});

export const setupSpotifyRoutes = (app) => {
  app.use(cookieParser());

  app.get('/login', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie('spotify_auth_state', state, { 
      httpOnly: true, 
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    const scopes = ['playlist-modify-private', 'playlist-modify-public'];
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
    res.redirect(authorizeURL);
  });

  app.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;

    if (state === null || state !== storedState) {
      console.error('State mismatch', { receivedState: state, storedState });
      return res.redirect('/#error=state_mismatch');
    }

    res.clearCookie('spotify_auth_state');

    try {
      const data = await spotifyApi.authorizationCodeGrant(code);
      const { access_token, refresh_token, expires_in } = data.body;
      res.redirect(`/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
    } catch (err) {
      console.error('Error during Spotify callback:', err);
      res.redirect('/#error=invalid_token');
    }
  });
};

export { spotifyApi };