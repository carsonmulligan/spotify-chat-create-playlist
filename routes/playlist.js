import { generatePlaylistFromAI } from './openAI.js'; // Import AI playlist generation function
import { spotifyApi } from './spotify.js'; // Import Spotify API instance

export const createPlaylist = async (req, res) => {
  const { prompt, accessToken } = req.body; // Extract prompt and accessToken from request body

  try {
    spotifyApi.setAccessToken(accessToken); // Set the access token for Spotify API calls

    // Generate playlist using AI
    const playlistData = await generatePlaylistFromAI(prompt);

    // Get user profile
    const me = await spotifyApi.getMe();

    // Create playlist on Spotify
    const playlist = await spotifyApi.createPlaylist(playlistData.name, {
      description: playlistData.description,
      public: false
    });

    // Search for tracks and add them to the playlist
    const trackUris = [];
    for (const track of playlistData.tracks) {
      const searchResults = await spotifyApi.searchTracks(`track:${track.name} artist:${track.artist}`);
      if (searchResults.body.tracks.items.length > 0) {
        trackUris.push(searchResults.body.tracks.items[0].uri);
      }
    }

    await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris); // Add tracks to the playlist

    res.json({ success: true, playlistUrl: playlist.body.external_urls.spotify }); // Send success response with playlist URL
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist', details: error.message }); // Send error response
  }
};