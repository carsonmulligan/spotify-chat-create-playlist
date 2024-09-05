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
    // Retrieve an access token
    const data = await spotifyApi.clientCredentialsGrant();
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);

    // Search tracks whose name, album or artist contains 'Love'
    const result = await spotifyApi.searchTracks(query);
    console.log('Search by "' + query + '"');

    const tracks = result.body.tracks.items;
    tracks.forEach((track, index) => {
      console.log(`${index + 1}. "${track.name}" by ${track.artists[0].name}`);
    });
  } catch (err) {
    console.log('Something went wrong!', err);
  }
}

// Test the search function
searchTracks('Love');