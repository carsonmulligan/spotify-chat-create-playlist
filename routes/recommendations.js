// recommendations.js

import { spotifyApi } from './spotify.js';

export const getRecommendations = async (req, res) => {
  const { seed, accessToken } = req.body;

  try {
    spotifyApi.setAccessToken(accessToken);

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
    res.json(recommendations.body.tracks);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations', details: error.message });
  }
};
