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
import favicon from 'serve-favicon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 8888;

app.use(express.static('public'));
// Comment out this line if you don't have a favicon.ico file
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.json());

// Add this route before your other routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
  console.log('Received code:', code);
  
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    console.log('Received tokens:', data.body);
    const { access_token, refresh_token, expires_in } = data.body;

    // Set the access token and refresh token on the Spotify API object
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    // Set up token refresh
    setInterval(async () => {
      const data = await spotifyApi.refreshAccessToken();
      const access_token = data.body['access_token'];
      console.log('Access token refreshed');
      spotifyApi.setAccessToken(access_token);
    }, expires_in / 2 * 1000);

    // Redirect to the frontend with the tokens
    res.redirect(`/#access_token=${access_token}&refresh_token=${refresh_token}`);
  } catch (error) {
    console.error('Error in /callback:', error);
    res.redirect('/#error=' + encodeURIComponent(error.message));
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
  console.log('Received playlist creation request');
  const { prompt, accessToken } = req.body;

  try {
    console.log('Generating playlist with OpenAI');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {"role": "system", "content": "You are a helpful assistant that creates Spotify playlists. Respond with a JSON object containing 'name', 'description', and 'tracks' (an array of objects with 'name' and 'artist' properties). Include up to 99 tracks."},
        {"role": "user", "content": `Create a playlist based on this description: ${prompt}`}
      ],
      response_format: { type: "json_object" }
    });

    const playlistData = JSON.parse(completion.choices[0].message.content);
    console.log('Generated playlist:', playlistData);

    console.log('Creating playlist on Spotify');
    spotifyApi.setAccessToken(accessToken);
    const playlist = await spotifyApi.createPlaylist(playlistData.name, { description: playlistData.description, public: false });

    console.log('Searching for tracks and adding to playlist');
    const trackUris = [];
    for (const track of playlistData.tracks) {
      const searchResults = await spotifyApi.searchTracks(`track:${track.name} artist:${track.artist}`);
      if (searchResults.body.tracks.items.length > 0) {
        trackUris.push(searchResults.body.tracks.items[0].uri);
      }
    }

    await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);

    console.log('Playlist created successfully');
    res.json({ 
      success: true, 
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
  console.log(`Server running at ${process.env.SPOTIFY_REDIRECT_URI.split('/callback')[0]}`);
});

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  next();
});

// New route to check environment variables
app.get('/debug-vars', (req, res) => {
  res.json({
    SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI,
    NODE_ENV: process.env.NODE_ENV
  });
});

// Uncomment this line to use the favicon
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));