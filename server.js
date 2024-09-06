import express from 'express';
import dotenv from 'dotenv';
import { setupSpotifyRoutes } from './routes/spotify.js';
import { createPlaylist } from './routes/playlist.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

setupSpotifyRoutes(app);

// Add this line to include the create-playlist route
app.post('/api/create-playlist', createPlaylist);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});