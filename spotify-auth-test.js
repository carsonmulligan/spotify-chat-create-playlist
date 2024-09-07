import dotenv from 'dotenv';
import SpotifyWebApi from 'spotify-web-api-node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

async function testSpotifyAuth() {
  try {
    // Get an access token using client credentials
    const data = await spotifyApi.clientCredentialsGrant();
    console.log('The access token is: ' + data.body['access_token']);

    // Set the access token
    spotifyApi.setAccessToken(data.body['access_token']);

    // Use the access token to retrieve information about the user
    const me = await spotifyApi.getMe();
    console.log('User information:', me.body);

    // Get the user's playlists
    const playlists = await spotifyApi.getUserPlaylists();
    console.log('User playlists:', playlists.body);

  } catch (error) {
    console.error('Something went wrong:', error);
  }
}

testSpotifyAuth();
