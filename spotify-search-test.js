import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import SpotifyWebApi from 'spotify-web-api-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

async function searchTracks(query) {
  try {
    console.log('Attempting to retrieve an access token...');
    const data = await spotifyApi.clientCredentialsGrant();
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    spotifyApi.setAccessToken(data.body['access_token']);

    console.log(`Searching for tracks with query: "${query}"`);
    const result = await spotifyApi.searchTracks(query);
    console.log('Search completed successfully');

    const tracks = result.body.tracks.items;
    tracks.forEach((track, index) => {
      console.log(`${index + 1}. "${track.name}" by ${track.artists[0].name}`);
    });
  } catch (err) {
    console.error('Error details:', err);
    if (err.body && err.body.error) {
      console.error('Spotify API error:', err.body.error);
    }
  }
}

// Test the search function
searchTracks('Love');