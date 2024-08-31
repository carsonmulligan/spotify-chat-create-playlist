import OpenAI from "openai";
import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import querystring from 'querystring';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const port = 8888; // Changed to match the callback URL

app.use(express.static('public'));
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
  project: process.env.OPENAI_PROJECT,
});

const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const spotifyRedirectUri = process.env.SPOTIFY_REDIRECT_URI;

// Spotify authentication route
app.get('/login', (req, res) => {
  const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: spotifyClientId,
      scope: scope,
      redirect_uri: spotifyRedirectUri,
    }));
});

// Spotify callback route
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  
  if (code) {
    try {
      const response = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        params: {
          code: code,
          redirect_uri: spotifyRedirectUri,
          grant_type: 'authorization_code'
        },
        headers: {
          'Authorization': 'Basic ' + (Buffer.from(spotifyClientId + ':' + spotifyClientSecret).toString('base64')),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, refresh_token } = response.data;
      // Here you would typically store these tokens securely and associate them with the user's session
      // For this example, we'll just send them back to the client
      res.json({ access_token, refresh_token });
    } catch (error) {
      console.error('Error getting Spotify tokens:', error);
      res.status(500).json({ error: 'Failed to get Spotify tokens' });
    }
  } else {
    res.status(400).json({ error: 'No code provided' });
  }
});

// OpenAI chat route
app.post('/api/chat', async (req, res) => {
  console.log('Received chat request:', req.body);
  
  try {
    console.log('Sending request to OpenAI');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": req.body.message}
      ],
      stream: true,
    });

    console.log('Received stream from OpenAI, starting to write response');

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    let fullResponse = '';

    for await (const chunk of completion) {
      if (chunk.choices[0].delta.content) {
        const content = chunk.choices[0].delta.content;
        console.log('Sending chunk:', content);
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    console.log('Finished streaming response');
    console.log('Full response:', fullResponse);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.', details: error.message });
  }
});

// New route to create a playlist
app.post('/api/create-playlist', async (req, res) => {
  const { name, description, tracks, accessToken } = req.body;

  try {
    // Create a new playlist
    const createPlaylistResponse = await axios.post(
      'https://api.spotify.com/v1/me/playlists',
      { name, description, public: false },
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const playlistId = createPlaylistResponse.data.id;

    // Add tracks to the playlist
    await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { uris: tracks },
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
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

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  next();
});