// createPlaylist.js
import { generatePlaylistFromGPT } from './openAI.js';
import SpotifyWebApi from 'spotify-web-api-node';

export const createPlaylist = async (req, res) => {
  const { prompt } = req.body;
  const accessToken = req.session.accessToken;
  const userId = req.session.userId;

  if (!accessToken || !userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const db = req.app.locals.db;
    const result = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'User not found in the database. Please log in again.' });
    }

    if (!user.is_subscribed && user.playlist_count >= 50) {
      return res.status(403).json({ error: 'You have reached your free playlist limit. Please subscribe to create more playlists.' });
    }

    // Generate playlist using OpenAI
    const playlistData = await generatePlaylistFromGPT(prompt);
    console.log('Generated playlist from GPT:', playlistData);

    // Create a new instance of SpotifyWebApi and set the access token
    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });
    spotifyApi.setAccessToken(accessToken);

    // Create a new playlist on Spotify
    const playlistName = playlistData.name || `AI Playlist: ${prompt}`;
    const playlist = await spotifyApi.createPlaylist(playlistName, { 
      description: playlistData.description || `Created with AI based on: ${prompt}`, 
      public: false 
    });

    // Search for and add tracks to the playlist
    const trackUris = [];
    for (const track of playlistData.tracks) {
      console.log(`Searching for track: ${track.name} by ${track.artist}`);
      const searchResults = await spotifyApi.searchTracks(`track:${track.name} artist:${track.artist}`);
      if (searchResults.body.tracks.items.length > 0) {
        trackUris.push(searchResults.body.tracks.items[0].uri);
        console.log(`Found track: ${track.name} by ${track.artist}`);
      } else {
        console.log(`Track not found: ${track.name} by ${track.artist}`);
      }
    }

    if (trackUris.length > 0) {
      await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);
    }

    // Update playlist count
    await db.query('UPDATE users SET playlist_count = playlist_count + 1 WHERE user_id = $1', [userId]);

    res.json({ success: true, playlistUrl: playlist.body.external_urls.spotify });
  } catch (error) {
    console.error('Error creating playlist:', error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
};
