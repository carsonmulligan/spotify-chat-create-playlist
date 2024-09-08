import { spotifyApi } from './spotifyAuth.js';

// User Journey:
// 1. User receives song suggestions from OpenAI
// 2. This module creates a new playlist on the user's Spotify account
// 3. Adds the suggested songs to the playlist

export const createPlaylist = async (req, res) => {
  const { name, description, tracks } = req.body;
  const accessToken = req.query.access_token;

  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
  }

  try {
    spotifyApi.setAccessToken(accessToken);

    // Create a new playlist
    const playlist = await spotifyApi.createPlaylist(name, { description: description, public: false });

    // Add tracks to the playlist
    await spotifyApi.addTracksToPlaylist(playlist.body.id, tracks);

    res.json({ success: true, playlistId: playlist.body.id });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
};