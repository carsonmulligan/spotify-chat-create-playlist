import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from "openai";
import SpotifyWebApi from 'spotify-web-api-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Define the function schema for generating a playlist
const functionSchema = {
  name: "generate_playlist",
  description: "Create a playlist from user input",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name of the playlist" },
      description: { type: "string", description: "Description of the playlist" },
      tracks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Track name" },
            artist: { type: "string", description: "Artist name" }
          },
          required: ["name", "artist"]
        }
      }
    },
    required: ["name", "tracks"]
  }
};

export const generatePlaylistFromGPT = async (prompt) => {
  try {
    console.log('Sending request to OpenAI');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {"role": "system", "content": "You are a helpful assistant that creates Spotify playlists based on user input. Try to return around 50 relevant tracks. Up to 99 tracks per playlist."},
        {"role": "user", "content": prompt}
      ],
      functions: [functionSchema],
      function_call: { name: "generate_playlist" },
    });

    console.log('Received response from OpenAI');
    const content = completion.choices[0].message.function_call.arguments;
    return JSON.parse(content);  // Parsed JSON with playlist name, description, and tracks
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
};

export const createPlaylist = async (req, res) => {
  const { prompt, accessToken } = req.body;
  const db = req.app.locals.db;

  try {
    // Get user from session
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user data from database
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
  try {
    // Step 1: Generate playlist using GPT with function calling
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
  // After successful playlist creation, increment playlist_count
  await db.run('UPDATE users SET playlist_count = playlist_count + 1 WHERE user_id = ?', [userId]);

  res.json({ success: true, playlistUrl: playlist.body.external_urls.spotify });
} catch (error) {
  console.error('Error creating playlist:', error);
  res.status(500).json({ error: 'Failed to create playlist', details: error.message });
}
};
