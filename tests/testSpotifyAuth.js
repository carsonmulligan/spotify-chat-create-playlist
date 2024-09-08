import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spotifyApi } from '../routes/spotifyAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function testSpotifyAuth() {
  console.log('Testing Spotify Authentication');

  // 1. Verify environment variables
  console.log('1. Verifying environment variables:');
  console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID ? 'Set' : 'Not set');
  console.log('SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET ? 'Set' : 'Not set');
  console.log('SPOTIFY_REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI);

  // 2. Test creating authorization URL
  console.log('\n2. Testing authorization URL creation:');
  const scopes = ['user-read-private', 'user-read-email', 'playlist-modify-private', 'playlist-modify-public'];
  const state = 'some-state-value';
  const authUrl = spotifyApi.createAuthorizeURL(scopes, state);
  console.log('Authorization URL:', authUrl);

  // 3. Test refreshing access token (if refresh token is available)
  console.log('\n3. Testing token refresh:');
  if (process.env.SPOTIFY_REFRESH_TOKEN) {
    try {
      spotifyApi.setRefreshToken(process.env.SPOTIFY_REFRESH_TOKEN);
      const data = await spotifyApi.refreshAccessToken();
      console.log('Access token refreshed successfully');
      console.log('New access token:', data.body['access_token'].substring(0, 10) + '...');
      console.log('Token expires in:', data.body['expires_in'], 'seconds');
      
      // Set the new access token for further tests
      spotifyApi.setAccessToken(data.body['access_token']);
    } catch (error) {
      console.error('Error refreshing access token:', error.message);
    }
  } else {
    console.log('No refresh token available in .env file');
  }

  // 4. Test fetching user profile
  console.log('\n4. Testing user profile fetch:');
  try {
    const me = await spotifyApi.getMe();
    console.log('User profile fetched successfully');
    console.log('Display name:', me.body.display_name);
    console.log('Email:', me.body.email);
    console.log('Spotify URI:', me.body.uri);
  } catch (error) {
    console.error('Error fetching user profile:', error.message);
    if (error.statusCode) {
      console.error('Status code:', error.statusCode);
    }
    if (error.body) {
      console.error('Error body:', error.body);
    }
  }

  // 5. Test creating a playlist (if access token is available)
  console.log('\n5. Testing playlist creation:');
  if (spotifyApi.getAccessToken()) {
    try {
      const playlist = await spotifyApi.createPlaylist('Test Playlist', { 'description': 'Created by test script', 'public': false });
      console.log('Playlist created successfully');
      console.log('Playlist ID:', playlist.body.id);
      console.log('Playlist URL:', playlist.body.external_urls.spotify);
    } catch (error) {
      console.error('Error creating playlist:', error.message);
      if (error.statusCode) {
        console.error('Status code:', error.statusCode);
      }
      if (error.body) {
        console.error('Error body:', error.body);
      }
    }
  } else {
    console.log('No access token available for playlist creation test');
  }
}

testSpotifyAuth().catch(console.error);
