import { generatePlaylistFromGPT } from './openAI.js';
import { spotifyApi } from './spotify.js';

async function refreshAccessToken(refreshToken) {
  try {
    console.log('Refreshing Spotify access token...');
    spotifyApi.setRefreshToken(refreshToken);
    const data = await spotifyApi.refreshAccessToken();
    console.log('Access token refreshed!');
    spotifyApi.setAccessToken(data.body.access_token);
    return data.body.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

export const createPlaylist = async (req, res) => {
  const { prompt, accessToken, refreshToken } = req.body;

  try {
    // Step 1: Generate playlist using GPT
    const playlistData = await generatePlaylistFromGPT(prompt);
    console.log('Generated playlist from GPT:', playlistData);

    // Step 2: Set Spotify access token
    spotifyApi.setAccessToken(accessToken);

    // Step 3: Create Spotify playlist
    const playlist = await spotifyApi.createPlaylist(playlistData.name, {
      description: playlistData.description,
      public: false,
    });

    const trackUris = [];
    for (const track of playlistData.tracks) {
      const searchResults = await spotifyApi.searchTracks(
        `track:${track.name} artist:${track.artist}`
      );
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
