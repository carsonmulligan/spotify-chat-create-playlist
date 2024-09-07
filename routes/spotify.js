import crypto from 'crypto';
import axios from 'axios';
import querystring from 'querystring';
import cookieParser from 'cookie-parser';

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback';

export const setupSpotifyRoutes = (app) => {
  app.use(cookieParser());

  app.get('/login', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie('spotify_auth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000
    });

    const scope = 'playlist-modify-private playlist-modify-public';
    const queryParams = querystring.stringify({
      response_type: 'code',
      client_id: clientId,
      scope: scope,
      redirect_uri: redirectUri,
      state: state,
      show_dialog: true
    });

    res.redirect(`https://accounts.spotify.com/authorize?${queryParams}`);
  });

  app.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;

    if (state === null || state !== storedState) {
      return res.redirect('/#error=state_mismatch');
    }

    res.clearCookie('spotify_auth_state');

    try {
      const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        method: 'post',
        params: {
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        },
        headers: {
          'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      const response = await axios(authOptions);
      const { access_token, refresh_token, expires_in } = response.data;

      res.redirect(`/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
    } catch (error) {
      console.error('Error during Spotify callback:', error.response ? error.response.data : error.message);
      res.redirect('/#error=invalid_token');
    }
  });
};

export const getSpotifyApi = (accessToken) => {
  return {
    createPlaylist: async (userId, name, options = {}) => {
      const response = await axios.post(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        { name, ...options },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      return response.data;
    },
    addTracksToPlaylist: async (playlistId, uris) => {
      const response = await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { uris },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      return response.data;
    },
    searchTracks: async (query) => {
      const response = await axios.get(
        `https://api.spotify.com/v1/search`,
        {
          params: { q: query, type: 'track', limit: 1 },
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      return response.data;
    },
    getMe: async () => {
      const response = await axios.get(
        'https://api.spotify.com/v1/me',
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      return response.data;
    }
  };
};