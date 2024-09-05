import { spotifyApi, refreshAccessToken } from './spotify.js';
import { openai } from './openAI.js';

export const createPlaylist = async (req, res) => {
  console.log('Received playlist creation request');
  const { prompt } = req.body;
  let accessToken = req.headers.authorization.split(' ')[1];

  try {
    console.log('Generating playlist with OpenAI');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {"role": "system", "content": "You are a helpful assistant that creates Spotify playlists. Respond with a JSON object containing 'name', 'description', and 'tracks' (an array of objects with 'name' and 'artist' properties). Include up to 99 tracks."},
        {"role": "user", "content": `Create a playlist based on this description: ${prompt}`}
      ],
      response_format: { type: "json_object" }
    });

    const playlistData = JSON.parse(completion.choices[0].message.content);
    console.log('Generated playlist:', playlistData);

    console.log('Creating playlist on Spotify');
    console.log('Using access token:', accessToken.substring(0, 10) + '...');
    spotifyApi.setAccessToken(accessToken);
    
    // Verify the access token
    try {
      console.log('Verifying access token');
      const me = await spotifyApi.getMe();
      console.log('User ID:', me.body.id);
    } catch (error) {
      console.error('Error verifying access token:', error);
      if (error.statusCode === 401 || error.statusCode === 403) {
        console.log('Token expired, refreshing...');
        const refreshedToken = await refreshAccessToken(req.body.refresh_token);
        accessToken = refreshedToken.access_token;
        spotifyApi.setAccessToken(accessToken);
      } else {
        throw error;
      }
    }

    // Create the playlist
    const playlist = await spotifyApi.createPlaylist(playlistData.name, { description: playlistData.description, public: false });
    console.log('Playlist created:', playlist.body);

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
      playlistUrl: playlist.body.external_urls.spotify,
      playlistName: playlist.body.name,
      trackCount: trackUris.length
    });
  } catch (error) {
    console.error('Error creating playlist:', error);
    console.error('Error details:', error.response ? JSON.stringify(error.response.body) : 'No response body');
    console.error('Error status:', error.statusCode);
    console.error('Error message:', error.message);
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
};