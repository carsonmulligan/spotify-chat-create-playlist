import SpotifyWebApi from 'spotify-web-api-node';
import crypto from 'crypto';
import { generatePlaylistFromAI } from './openAI.js';
import cookieParser from 'cookie-parser';

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

export const setupSpotifyRoutes = (app) => {
  app.use(cookieParser());

  app.get('/login', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie('spotify_auth_state', state, { httpOnly: true, sameSite: 'lax' });
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

  app.post('/create-playlist', async (req, res) => {
    const { prompt, accessToken } = req.body;

    try {
      spotifyApi.setAccessToken(accessToken);

      const playlistData = await generatePlaylistFromAI(prompt);
      const me = await spotifyApi.getMe();
      const playlist = await spotifyApi.createPlaylist(me.body.id, playlistData.name, { public: false, description: playlistData.description });

      const trackUris = [];
      for (const track of playlistData.tracks) {
        const searchResults = await spotifyApi.searchTracks(`track:${track.name} artist:${track.artist}`);
        if (searchResults.body.tracks.items.length > 0) {
          trackUris.push(searchResults.body.tracks.items[0].uri);
        }
      }

      await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);

      res.json({ success: true, playlistUrl: playlist.body.external_urls.spotify });
    } catch (error) {
      console.error('Error creating playlist:', error);
      res.status(500).json({ error: 'Failed to create playlist', details: error.message });
    }
  });
};

export { spotifyApi };
