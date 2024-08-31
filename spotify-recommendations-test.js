import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';
import express from 'express';

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
  const scopes = ['user-read-private', 'user-read-email'];
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    accessToken = data.body['access_token'];
    spotifyApi.setAccessToken(accessToken);
    res.send('Login successful! You can close this window and check the console.');
    runRecommendationsTest();
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.send('Error during authentication');
  }
});

async function getRecommendations(seed) {
  try {
    let params = {
      limit: 5,
      market: 'US'
    };

    if (seed.startsWith('spotify:track:')) {
      params.seed_tracks = [seed];
    } else if (seed.startsWith('spotify:artist:')) {
      params.seed_artists = [seed];
    } else {
      params.seed_genres = [seed];
    }

    const recommendations = await spotifyApi.getRecommendations(params);
    return recommendations.body.tracks;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
}

async function runRecommendationsTest() {
  try {
    console.log('Testing Spotify Recommendations API...');

    // Test with a track
    console.log('\nRecommendations based on track "Billie Jean":');
    const trackSeed = 'spotify:track:5ChkMS8OtdzJeqyybCc9R5'; // Billie Jean by Michael Jackson
    const trackRecommendations = await getRecommendations(trackSeed);
    logRecommendations(trackRecommendations);

    // Test with an artist
    console.log('\nRecommendations based on artist "Queen":');
    const artistSeed = 'spotify:artist:1dfeR4HaWDbWqFHLkxsg1d'; // Queen
    const artistRecommendations = await getRecommendations(artistSeed);
    logRecommendations(artistRecommendations);

    // Test with a genre
    console.log('\nRecommendations based on genre "rock":');
    const genreRecommendations = await getRecommendations('rock');
    logRecommendations(genreRecommendations);

    console.log('\nSpotify Recommendations API test completed successfully!');
  } catch (error) {
    console.error('Error during Spotify Recommendations API test:', error);
  }
}

function logRecommendations(tracks) {
  tracks.forEach((track, index) => {
    console.log(`${index + 1}. "${track.name}" by ${track.artists.map(artist => artist.name).join(', ')}`);
  });
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Please visit http://localhost:8888/login in your browser to start the Spotify Recommendations API test');
});