// server.js
import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';
import cookieParser from 'cookie-parser';
import Stripe from 'stripe';

// Import routes
import { spotifyAuth } from './routes/spotifyAuth.js';
import { openAI } from './routes/openAI.js';
import { createPlaylist } from './routes/createPlaylist.js';
import { stripeRoutes } from './routes/stripeRoutes.js';

dotenv.config();

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage for simplicity
const userPlaylistCounts = {}; // { userId: count }
const userSubscriptions = {}; // { userId: true/false }

// Middleware to get user ID from access token
app.use(async (req, res, next) => {
  const accessToken = req.headers.authorization?.split(' ')[1] || req.query.access_token;
  if (accessToken) {
    try {
      const userId = await getUserIdFromAccessToken(accessToken);
      req.userId = userId;
    } catch (err) {
      console.error('Error fetching user ID:', err);
    }
  }
  next();
});

// Function to get user ID from Spotify access token
async function getUserIdFromAccessToken(accessToken) {
  const SpotifyWebApi = (await import('spotify-web-api-node')).default;
  const spotifyApi = new SpotifyWebApi();
  spotifyApi.setAccessToken(accessToken);
  const data = await spotifyApi.getMe();
  return data.body.id;
}

// Use imported routes
app.use('/', spotifyAuthRoutes);
app.use('/', openAIRoutes);
app.use('/', createPlaylistRoutes(userPlaylistCounts, userSubscriptions));
app.use('/', stripeRoutes(userPlaylistCounts, userSubscriptions));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred', details: err.message });
});

const port = process.env.PORT || 8888;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
