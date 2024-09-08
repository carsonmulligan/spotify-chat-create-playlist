// File: createPlaylistTest.js
// Description: Test suite for the createPlaylist function

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createPlaylist } from '../routes/createPlaylist.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Mock request and response objects for testing
const mockRequest = (body) => {
  return {
    body
  };
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const testCreatePlaylist = async () => {
  const req = mockRequest({
    prompt: 'Top 10 songs of 2021',
    accessToken: process.env.SPOTIFY_ACCESS_TOKEN // Use the access token from .env file
  });

  const res = mockResponse();

  await createPlaylist(req, res);

  // Log the response
  console.log('Response:', res.json.mock.calls);
};

testCreatePlaylist();
