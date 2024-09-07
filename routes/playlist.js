import { spotifyApi, refreshAccessToken } from '../server.js';

export async function createPlaylist(req, res) {
  try {
    await refreshAccessToken();
    const { name, description, tracks } = req.body;
    const userData = await spotifyApi.getMe();
    const playlist = await spotifyApi.createPlaylist(userData.body.id, name, { description: description, public: false });
    await spotifyApi.addTracksToPlaylist(playlist.body.id, tracks);
    res.json({ success: true, playlistId: playlist.body.id });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
}