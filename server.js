import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import querystring from 'querystring';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Serve the landing page
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'landing.html'));
});

// Spotify login
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

// Handle Spotify callback
app.get('/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }),
      headers: {
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token } = tokenResponse.data;
    
    // Redirect to the index.html with the access token
    res.redirect(`/index.html#access_token=${access_token}`);
  } catch (error) {
    res.redirect('/#error=authentication_failed');
  }
});

// Create playlist route
app.post('/api/create-playlist', async (req, res) => {
  const { prompt, accessToken } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a playlist creator. You will return the output in JSON format.' },
        { role: 'user', content: `Create a playlist in JSON format based on the following description: ${prompt}` }
      ],
      response_format: { type: 'json_object' }
    });

    const playlistData = JSON.parse(completion.choices[0].message.content);
    const { name, description, tracks } = playlistData;

    // Create Spotify playlist
    const createPlaylistResponse = await axios.post(
      'https://api.spotify.com/v1/me/playlists',
      { name, description, public: false },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const playlistId = createPlaylistResponse.data.id;
    const uris = tracks.map(track => `spotify:track:${track.id}`);

    await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { uris },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    res.json({ success: true, playlistId });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
