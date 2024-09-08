import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPlaylist } from './createPlaylist.js';
import dotenv from 'dotenv';

dotenv.config();

// Manually define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Route to create playlist
app.post('/api/create-playlist', createPlaylist);

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
