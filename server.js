import OpenAI from "openai";
import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import querystring from 'querystring';
import axios from 'axios';
import SpotifyWebApi from 'spotify-web-api-node';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const port = 8888;

app.use(express.static('public'));
app.use(express.json());

// Add this route before your other routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
  project: process.env.OPENAI_PROJECT,
});

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Spotify authentication route
app.get('/login', (req, res) => {
  const scopes = ['playlist-modify-private', 'playlist-modify-public'];
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

// Spotify callback route
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token } = data.body;
    
    // In a real application, you'd want to store these tokens securely
    // For this example, we'll send them back to the client
    res.redirect(`/#access_token=${access_token}&refresh_token=${refresh_token}`);
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    res.redirect('/#error=spotify_auth_error');
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
    res.write(`data: ${JSON.stringify({ content: '[DONE]' })}\n\n`);
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
    spotifyApi.setAccessToken(accessToken);

    // Create a new playlist
    const playlist = await spotifyApi.createPlaylist(name, { description, public: false });

    // Search for tracks and add them to the playlist
    const trackUris = [];
    for (const track of tracks) {
      const searchResults = await spotifyApi.searchTracks(`track:${track.title} artist:${track.artist}`);
      if (searchResults.body.tracks.items.length > 0) {
        trackUris.push(searchResults.body.tracks.items[0].uri);
      }
    }

    // Add tracks to the playlist
    await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);

    res.json({ 
      success: true, 
      playlistId: playlist.body.id, 
      playlistUrl: playlist.body.external_urls.spotify 
    });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
});

// Add this new route for getting recommendations
app.post('/api/get-recommendations', async (req, res) => {
  const { seed, accessToken } = req.body;

  try {
    spotifyApi.setAccessToken(accessToken);

    let params = {
      limit: 5,
      market: 'US'
    };

    if (seed.startsWith('spotify:track:')) {
      params.seed_tracks = [seed];
    } else if (seed.startsWith('spotify:artist:')) {
      params.seed_artists = [seed];
    } else {
      params.seed_genres = [seed];
    }

    const recommendations = await spotifyApi.getRecommendations(params);
    res.json(recommendations.body.tracks);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations', details: error.message });
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