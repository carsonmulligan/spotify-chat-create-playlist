import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';
import express from 'express';
import open from 'open';

dotenv.config();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

const app = express();
const port = 8888;

let accessToken = null;

app.get('/login', (req, res) => {
  const scopes = ['playlist-modify-private', 'playlist-modify-public'];
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    accessToken = data.body['access_token'];
    spotifyApi.setAccessToken(accessToken);
    res.send('Login successful! You can close this window and check the console.');
    runSpotifyTest();
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.send('Error during authentication');
  }
});

async function runSpotifyTest() {
  try {
    console.log('Testing Spotify API...');

    // Get user profile
    const me = await spotifyApi.getMe();
    console.log('Successfully retrieved user profile. Display name:', me.body.display_name);

    // Create a playlist
    const playlist = await spotifyApi.createPlaylist('Test Playlist', { 'description': 'Created by Spotify API test', 'public': false });
    console.log('Successfully created playlist:', playlist.body.name, 'with ID:', playlist.body.id);

    // Search for a track
    const searchResults = await spotifyApi.searchTracks('track:Billie Jean artist:Michael Jackson');
    if (searchResults.body.tracks.items.length > 0) {
      const trackUri = searchResults.body.tracks.items[0].uri;
      
      // Add the track to the playlist
      await spotifyApi.addTracksToPlaylist(playlist.body.id, [trackUri]);
      console.log('Successfully added track to playlist');
    } else {
      console.log('No tracks found in search');
    }

    console.log('Spotify API test completed successfully!');
  } catch (error) {
    console.error('Error during Spotify API test:', error);
  }
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Please visit http://localhost:8888/login to start the Spotify API test');
  open('http://localhost:8888/login');
});