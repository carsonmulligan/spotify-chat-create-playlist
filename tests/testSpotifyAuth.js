// File: testSpotifyAuth.js
// Description: A simple script to test Spotify API token management and playlist creation.

import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Spotify API with your credentials
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// Access token and refresh token from environment or previous session (replace with your tokens)
let accessToken = process.env.SPOTIFY_ACCESS_TOKEN || null;
let refreshToken = process.env.SPOTIFY_REFRESH_TOKEN || null;

// Helper function to refresh token if expired
async function refreshAccessToken() {
  try {
    const data = await spotifyApi.refreshAccessToken();
    accessToken = data.body['access_token'];
    console.log('New access token:', accessToken);
    // Set the new access token in the Spotify API instance
    spotifyApi.setAccessToken(accessToken);
  } catch (error) {
    console.error('Error refreshing access token:', error);
  }
}

// Step 1: Set the initial access token and refresh token in Spotify API
if (accessToken) {
  spotifyApi.setAccessToken(accessToken);
}
if (refreshToken) {
  spotifyApi.setRefreshToken(refreshToken);
}

// Step 2: Fetch user profile to verify the access token is valid
async function fetchUserProfile() {
  try {
    const me = await spotifyApi.getMe();
    console.log('User profile:', me.body);
  } catch (error) {
    if (error.statusCode === 401) {
      console.log('Access token expired, refreshing...');
      await refreshAccessToken();
      await fetchUserProfile(); // Retry fetching profile after refreshing token
    } else {
      console.error('Error fetching user profile:', error);
    }
  }
}

// Step 3: Create a simple playlist on the user's account
async function createTestPlaylist() {
  try {
    const playlist = await spotifyApi.createPlaylist('Test Playlist', {
      description: 'Playlist created during debugging',
      public: false,
    });
    console.log('Playlist created:', playlist.body);
  } catch (error) {
    if (error.statusCode === 401) {
      console.log('Access token expired, refreshing...');
      await refreshAccessToken();
      await createTestPlaylist(); // Retry playlist creation after refreshing token
    } else {
      console.error('Error creating playlist:', error);
    }
  }
}

// Main function to test the flow
async function testSpotifyAPI() {
  await fetchUserProfile(); // Step 2: Verify access token by fetching user profile
  await createTestPlaylist(); // Step 3: Create a playlist to test further API calls
}

// Run the test
testSpotifyAPI();