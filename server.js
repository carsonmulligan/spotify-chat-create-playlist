import express from 'express';
import dotenv from 'dotenv';
import { spotifyLogin, spotifyCallback, createPlaylist } from './routes/spotify.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

app.get('/login', spotifyLogin);
app.get('/callback', spotifyCallback);
app.post('/create-playlist', createPlaylist);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
