// routes/playlist.js

import { openai } from './openAI.js';
import { spotifyApi, refreshAccessToken } from './spotify.js';

export const createPlaylist = async (req, res) => {
  console.log('Received playlist creation request');
  const { prompt, accessToken, refreshToken } = req.body;
  
  console.log('Access Token received:', accessToken ? 'Yes' : 'No');
  console.log('Refresh Token received:', refreshToken ? 'Yes' : 'No');

  try {
    console.log('Generating playlist with OpenAI');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {"role": "system", "content": "You are a helpful assistant that creates Spotify playlists. Respond with a JSON object containing 'name', 'description', and 'tracks' (an array of objects with 'name' and 'artist' properties). Include up to 99 tracks."},
        {"role": "user", "content": `Create a playlist based on this description: ${prompt}`}
      ],
      response_format: { type: "json_object" }
    });

    console.log('OpenAI response received');
    const playlistData = JSON.parse(completion.choices[0].message.content);
    console.log('Generated playlist:', playlistData);

    console.log('Setting Spotify access token');
    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);

    try {
      console.log('Creating playlist on Spotify');
      const me = await spotifyApi.getMe();
      const playlist = await spotifyApi.createPlaylist(me.body.id, playlistData.name, { description: playlistData.description, public: false });
      
      console.log('Searching for tracks and adding to playlist');
      const trackUris = [];
      for (const track of playlistData.tracks) {
        console.log(`Searching for track: ${track.name} by ${track.artist}`);
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
      if ((error.statusCode === 401 || error.statusCode === 403) && refreshToken) {
        console.log('Access token expired or insufficient permissions, attempting to refresh');
        const data = await spotifyApi.refreshAccessToken();
        const newAccessToken = data.body['access_token'];
        spotifyApi.setAccessToken(newAccessToken);
        
        // Retry creating the playlist with the new access token
        console.log('Retrying playlist creation with new access token');
        const me = await spotifyApi.getMe();
        const playlist = await spotifyApi.createPlaylist(me.body.id, playlistData.name, { description: playlistData.description, public: false });
        
        console.log('Searching for tracks and adding to playlist');
        const trackUris = [];
        for (const track of playlistData.tracks) {
          console.log(`Searching for track: ${track.name} by ${track.artist}`);
          const searchResults = await spotifyApi.searchTracks(`track:${track.name} artist:${track.artist}`);
          if (searchResults.body.tracks.items.length > 0) {
            trackUris.push(searchResults.body.tracks.items[0].uri);
          }
        }

        await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);

        console.log('Playlist created successfully after token refresh');
        res.json({ 
          success: true, 
          playlistUrl: playlist.body.external_urls.spotify,
          newAccessToken: newAccessToken
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error creating playlist:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    res.status(500).json({ 
      error: 'Failed to create playlist', 
      details: error.message,
      name: error.name
    });
  }
};