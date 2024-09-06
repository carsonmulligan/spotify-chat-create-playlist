import { generatePlaylistFromAI } from './openAI.js';
import { spotifyApi } from './spotify.js';

export const createPlaylist = async (req, res) => {
  const { prompt, accessToken } = req.body;

  try {
    spotifyApi.setAccessToken(accessToken);

    // Generate playlist using AI
    const playlistData = await generatePlaylistFromAI(prompt);

    // Create playlist on Spotify
    const me = await spotifyApi.getMe();
    const playlist = await spotifyApi.createPlaylist(me.body.id, playlistData.name, { public: false, description: playlistData.description });

    // Search for tracks and add them to the playlist
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
};