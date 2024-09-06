import express from 'express';
import dotenv from 'dotenv';
import { setupSpotifyRoutes } from './routes/spotify.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

setupSpotifyRoutes(app);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
