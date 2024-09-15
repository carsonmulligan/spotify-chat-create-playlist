import { generatePlaylistFromGPT } from './openAI.js';
import { spotifyApi } from './spotifyAuth.js';

export const createPlaylist = async (req, res) => {
  const { prompt } = req.body;
  const accessToken = req.session.accessToken;
  const userId = req.session.userId;

  if (!accessToken || !userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const db = req.app.locals.db;
    const user = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);

    if (!user.is_subscribed && user.playlist_count >= 3) {
      return res.status(403).json({ error: 'You have reached your free playlist limit. Please subscribe to create more playlists.' });
    }

    // Generate playlist using OpenAI
    const songs = await generatePlaylistFromGPT(prompt);

    // Create a new playlist on Spotify
    spotifyApi.setAccessToken(accessToken);
    const playlistName = `AI Playlist: ${prompt}`;
    const playlist = await spotifyApi.createPlaylist(playlistName, { 'description': `Created with AI based on: ${prompt}`, 'public': false });

    // Add tracks to the playlist
    const trackUris = songs.map(song => `spotify:track:${song.id}`);
    await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);

    // Update playlist count
    await db.run('UPDATE users SET playlist_count = playlist_count + 1 WHERE user_id = ?', [userId]);

    res.json({ success: true, playlistUrl: playlist.body.external_urls.spotify });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
};

// const { prompt, accessToken, refreshToken } = req.body; // leave this old way commented out at 
// the bottom in case we need it to handle refresh token logic
