// File: createPlaylist.js
// Description: Handles the creation of a new playlist on Spotify

import { generatePlaylistFromGPT } from './openAI.js';
import { spotifyApi } from './spotifyAuth.js';

export const createPlaylist = async (req, res) => {
  const { prompt, accessToken } = req.body;

  try {
    // Step 1: Generate playlist using GPT
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

    // Send the OpenAI-generated playlist data back to the frontend
    res.json({
      success: true,
      playlistUrl: playlist.body.external_urls.spotify,
      playlistData: {
        name: playlistData.name,
        description: playlistData.description,
        tracks: playlistData.tracks,
      },
    });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
};

// This file:
// 1. Exports the createPlaylist function used as a route handler
// 2. Generates a playlist using GPT based on the user's prompt
// 3. Creates a new playlist on the user's Spotify account
// 4. Searches for and adds tracks to the created playlist
// 5. Sends the playlist data and Spotify URL back to the client
