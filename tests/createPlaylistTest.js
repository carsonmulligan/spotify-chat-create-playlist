// File: createPlaylistTest.js
// Description: Test suite for the createPlaylist function

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createPlaylist } from '../routes/createPlaylist.js';
import { spotifyApi } from '../routes/spotifyAuth.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Mock request and response objects for testing
const mockRequest = (body) => ({ body });
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const testCreatePlaylist = async () => {
  try {
    // Refresh the access token
    spotifyApi.setRefreshToken(process.env.SPOTIFY_REFRESH_TOKEN);
    const data = await spotifyApi.refreshAccessToken();
    const accessToken = data.body['access_token'];
    console.log('Access token refreshed successfully');

    const req = mockRequest({
      prompt: 'Top 10 songs of 2021',
      accessToken: accessToken
    });

    const res = mockResponse();

    await createPlaylist(req, res);

    console.log('Response:', res.json.mock.calls);
  } catch (error) {
    console.error('Error in testCreatePlaylist:', error);
  }
};

testCreatePlaylist();
