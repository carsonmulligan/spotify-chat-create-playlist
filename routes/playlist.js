import { spotifyApi, refreshAccessToken } from '../server.js';

// Step 4: Create a new playlist
export async function createPlaylist(req, res) {
  try {
    // Ensure we have a valid access token
    await refreshAccessToken();

    // Extract playlist details from the request body
    const { name, description, tracks } = req.body;

    // Get the current user's Spotify profile
    const userData = await spotifyApi.getMe();

    // Create a new playlist
    const playlist = await spotifyApi.createPlaylist(userData.body.id, name, { description: description, public: false });

    // Add tracks to the newly created playlist
    await spotifyApi.addTracksToPlaylist(playlist.body.id, tracks);

    // Send a success response with the new playlist ID
    res.json({ success: true, playlistId: playlist.body.id });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
}