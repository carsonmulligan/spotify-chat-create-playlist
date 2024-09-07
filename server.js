import express from 'express'; // Import the Express framework
import dotenv from 'dotenv'; // Import dotenv for environment variable management
import { setupSpotifyRoutes } from './routes/spotify.js'; // Import Spotify route setup function
import { createPlaylist } from './routes/playlist.js'; // Import createPlaylist function

dotenv.config(); // Load environment variables from .env file

const app = express(); // Create an Express application
const PORT = process.env.PORT || 3000; // Set the port, use environment variable or default to 3000

app.use(express.static('public')); // Serve static files from the 'public' directory
app.use(express.json()); // Parse JSON request bodies

setupSpotifyRoutes(app); // Set up Spotify authentication routes

// Add the create-playlist route
app.post('/api/create-playlist', createPlaylist); // Handle POST requests to create a playlist

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); // Start the server and log the port
});