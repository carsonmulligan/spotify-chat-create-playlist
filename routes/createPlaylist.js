import { generatePlaylistFromGPT } from './openAI.js';
import { spotifyApi } from './spotifyAuth.js';

export const createPlaylist = async (req, res) => {
  const { prompt } = req.body;
  const db = req.app.locals.db;

  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.is_subscribed && user.playlist_count >= 3) {
      return res.status(403).json({ error: 'Playlist limit reached. Please subscribe to create more playlists.' });
    }

    const accessToken = req.session.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'Spotify access token not found' });
    }

    spotifyApi.setAccessToken(accessToken);

    // Generate playlist using OpenAI
    const songs = await generatePlaylistFromGPT(prompt);

    // Create a new playlist
    const playlistName = `AI Playlist: ${prompt}`;
    const playlist = await spotifyApi.createPlaylist(playlistName, { 'description': `Created with AI based on: ${prompt}`, 'public': false });

    // Add tracks to the playlist
    const trackUris = songs.map(song => `spotify:track:${song.id}`);
    await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);

    // Increment the playlist count for the user
    await db.run('UPDATE users SET playlist_count = playlist_count + 1 WHERE user_id = ?', [userId]);

    res.json({ success: true, playlistUrl: playlist.body.external_urls.spotify });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
};
