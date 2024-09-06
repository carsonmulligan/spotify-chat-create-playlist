import SpotifyWebApi from 'spotify-web-api-node';
import crypto from 'crypto';
import { generatePlaylistFromAI } from './openAI.js';

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// Spotify login
export const spotifyLogin = (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('spotify_auth_state', state);

  const scopes = ['playlist-modify-private', 'playlist-modify-public'];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

  res.redirect(authorizeURL);
};

// Spotify callback
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

    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    res.redirect(`/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
  } catch (err) {
    console.error('Error during Spotify callback:', err);
    res.redirect('/#error=invalid_token');
  }
};

// Create a playlist on Spotify
export const createPlaylist = async (req, res) => {
  const { prompt, accessToken, refreshToken } = req.body;

  try {
    spotifyApi.setAccessToken(accessToken);

    // Generate playlist using OpenAI
    const playlistData = await generatePlaylistFromAI(prompt);

    const me = await spotifyApi.getMe();
    const playlist = await spotifyApi.createPlaylist(me.body.id, playlistData.name, { public: false });

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
    res.status(500).json({ error: 'Failed to create playlist' });
  }
};
