import axios from 'axios';
import querystring from 'querystring';
import dotenv from 'dotenv';
import { spotifyApi, refreshAccessToken } from '../server.js';

dotenv.config();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback';

export const setupSpotifyRoutes = (app) => {
  // Step 1: Initiate Spotify login
  app.get('/login', (req, res) => {
    const scope = 'playlist-modify-private playlist-modify-public';
    const state = Math.random().toString(36).substring(2, 15);

    if (!clientId) {
      console.error('SPOTIFY_CLIENT_ID is not set');
      return res.status(500).send('Server configuration error');
    }

    const queryParams = querystring.stringify({
      response_type: 'code',
      client_id: clientId,
      scope: scope,
      redirect_uri: redirectUri,
      state: state
    });

    res.redirect(`https://accounts.spotify.com/authorize?${queryParams}`);
  });

  // Step 2: Handle Spotify callback
  app.get('/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const response = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        params: {
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        },
        headers: {
          'Authorization': 'Basic ' + (Buffer.from(clientId + ':' + clientSecret).toString('base64')),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      const { access_token, refresh_token } = response.data;
      res.redirect(`/#access_token=${access_token}&refresh_token=${refresh_token}`);
    } catch (error) {
      res.redirect('/#error=invalid_token');
    }
  });

  // Step 3: Get current user's Spotify profile
  app.get('/api/current-user', async (req, res) => {
    try {
      await refreshAccessToken();
      const data = await spotifyApi.getMe();
      res.json(data.body);
    } catch (error) {
      console.error('Error getting current user:', error);
      res.status(500).json({ error: 'Failed to get current user' });
    }
  });

  // Add other Spotify-related routes here
};

// Helper function to create a Spotify API wrapper with the given access token
export const getSpotifyApi = (accessToken) => {
  return {
    // Create a new playlist
    createPlaylist: async (userId, name, options = {}) => {
      const response = await axios.post(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        { name, ...options },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      return response.data;
    },
    // Add tracks to an existing playlist
    addTracksToPlaylist: async (playlistId, uris) => {
      const response = await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { uris },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      return response.data;
    },
    // Search for tracks
    searchTracks: async (query) => {
      const response = await axios.get(
        `https://api.spotify.com/v1/search`,
        {
          params: { q: query, type: 'track', limit: 1 },
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      return response.data;
    },
    // Get the current user's Spotify profile
    getMe: async () => {
      const response = await axios.get(
        'https://api.spotify.com/v1/me',
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      return response.data;
    }
  };
};