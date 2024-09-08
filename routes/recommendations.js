import { spotifyApi } from './spotifyAuth.js';

// User Journey:
// 1. User receives initial song suggestions from OpenAI
// 2. This module fetches additional recommendations from Spotify based on those suggestions
// 3. Returns an expanded list of song recommendations

export const getRecommendations = async (req, res) => {
  const { seedTracks } = req.body;
  const accessToken = req.query.access_token;

  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is required' });
  }

  try {
    spotifyApi.setAccessToken(accessToken);

    const recommendations = await spotifyApi.getRecommendations({
      seed_tracks: seedTracks,
      limit: 20
    });

    res.json(recommendations.body.tracks);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations', details: error.message });
  }
};