import { spotifyApi } from './spotify.js';
import { openai } from './openai.js';

export const createPlaylist = async (req, res) => {
  console.log('Received playlist creation request');
  const { prompt, accessToken } = req.body;

  try {
    console.log('Generating playlist with OpenAI');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {"role": "system", "content": "You are a helpful assistant that creates Spotify playlists. Respond with a JSON object containing 'name', 'description', and 'tracks' (an array of objects with 'name' and 'artist' properties). Include up to 99 tracks."},
        {"role": "user", "content": `Create a playlist based on this description: ${prompt}`}
      ],
      response_format: { type: "json_object" }
    });

    const playlistData = JSON.parse(completion.choices[0].message.content);
    console.log('Generated playlist:', playlistData);

    console.log('Creating playlist on Spotify');
    spotifyApi.setAccessToken(accessToken);
    const playlist = await spotifyApi.createPlaylist(playlistData.name, { description: playlistData.description, public: false });

    console.log('Searching for tracks and adding to playlist');
    const trackUris = [];
    for (const track of playlistData.tracks) {
      const searchResults = await spotifyApi.searchTracks(`track:${track.name} artist:${track.artist}`);
      if (searchResults.body.tracks.items.length > 0) {
        trackUris.push(searchResults.body.tracks.items[0].uri);
      }
    }

    await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);

    console.log('Playlist created successfully');
    res.json({ 
      success: true, 
      playlistUrl: playlist.body.external_urls.spotify 
    });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
};