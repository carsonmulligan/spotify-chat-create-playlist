import express from 'express'; // Import the Express framework
import dotenv from 'dotenv'; // Import dotenv for environment variable management
import { setupSpotifyRoutes } from './routes/spotify.js'; // Import Spotify route setup function
import { createPlaylist } from './routes/playlist.js'; // Import createPlaylist function
import path from 'path'; // Import path module for directory handling
import { fileURLToPath } from 'url'; // Import fileURLToPath function for URL handling

dotenv.config(); // Load environment variables from .env file

const __filename = fileURLToPath(import.meta.url); // Get the current file path
const __dirname = path.dirname(__filename); // Get the current directory path

const app = express(); // Create an Express application
const PORT = process.env.PORT || 3000; // Set the port, use environment variable or default to 3000

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory
app.use(express.json()); // Parse JSON request bodies

setupSpotifyRoutes(app); // Set up Spotify authentication routes

// Add the create-playlist route
app.post('/api/create-playlist', createPlaylist); // Handle POST requests to create a playlist

// Add a catch-all route to serve the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')); // Serve the index.html file
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); // Start the server and log the port
});