import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import querystring from 'querystring';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

// Spotify API configuration
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback';

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set up file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware setup
app.use(express.static('public'));
app.use(express.json());

// Serve the landing page
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Step 1: Initiate Spotify login
app.get('/login', (req, res) => {
  const scopes = 'playlist-modify-private playlist-modify-public';
  const state = Math.random().toString(36).substring(2, 15);

  const queryParams = querystring.stringify({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state: state
  });

  res.redirect(`https://accounts.spotify.com/authorize?${queryParams}`);
});

// Step 2: Handle Spotify callback after login
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
    // Send the access token to the frontend as part of the redirect
    res.redirect(`/create-playlist#access_token=${access_token}`);
  } catch (error) {
    res.redirect('/#error=authentication_failed');
  }
});

// Step 3: Handle playlist creation request
app.post('/api/create-playlist', async (req, res) => {
  const { prompt, accessToken } = req.body;

  try {
    // Generate playlist from OpenAI prompt
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {"role": "system", "content": "Create a Spotify playlist."},
        {"role": "user", "content": `Create a playlist based on this description: ${prompt}`}
      ],
      response_format: { type: 'json_object' }
    });

    const playlistData = JSON.parse(completion.choices[0].message.content);
    const { name, description, tracks } = playlistData;

    // Create Spotify playlist
    const response = await axios.post(
      `https://api.spotify.com/v1/me/playlists`,
      { name, description, public: false },
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    
    const playlistId = response.data.id;

    // Add tracks to the playlist
    const uris = tracks.map(track => `spotify:track:${track.id}`);
    await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { uris },
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    res.json({ success: true, playlistId });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
