import { createPlaylist } from '../routes/createPlaylist.js';

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
    accessToken: 'YOUR_VALID_SPOTIFY_ACCESS_TOKEN'  // Replace with a valid token for testing
  });

  const res = mockResponse();

  await createPlaylist(req, res);

  // Log the response
  console.log('Response:', res.json.mock.calls);
};

testCreatePlaylist();
