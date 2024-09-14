// routes/createPlaylist.js
import { generatePlaylistFromGPT } from './openAI.js';

export const createPlaylist = async (req, res, pool, stripe) => {
  const { prompt } = req.body;
  const accessToken = req.accessToken;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    // Check if user exists in the database
    let userResult = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);

    if (userResult.rows.length === 0) {
      // Insert new user
      await pool.query('INSERT INTO users (user_id, playlist_count, is_subscribed) VALUES ($1, $2, $3)', [userId, 0, false]);
      userResult = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    }

    const user = userResult.rows[0];

    if (!user.is_subscribed && user.playlist_count >= 3) {
      return res.status(403).json({ error: 'Limit reached' });
    }

    // Step 1: Generate playlist using GPT
    const playlistData = await generatePlaylistFromGPT(prompt);

    // Step 2: Set Spotify access token
    const SpotifyWebApi = (await import('spotify-web-api-node')).default;
    const spotifyApi = new SpotifyWebApi();
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

    // Update playlist count
    await pool.query('UPDATE users SET playlist_count = playlist_count + 1 WHERE user_id = $1', [userId]);

    res.json({ success: true, playlistUrl: playlist.body.external_urls.spotify });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
};
