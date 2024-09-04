import SpotifyWebApi from 'spotify-web-api-node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const spotifyApi = new SpotifyWebApi();

export const createPlaylist = async (req, res) => {
  const { prompt, accessToken } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { "role": "system", "content": "You create Spotify playlists." },
        { "role": "user", "content": `Create a playlist based on this description: ${prompt}` }
      ],
      response_format: { type: "json_object" }
    });

    const playlistData = JSON.parse(completion.choices[0]?.message?.content);

    spotifyApi.setAccessToken(accessToken);
    const playlist = await spotifyApi.createPlaylist(playlistData.name, { description: playlistData.description, public: false });

    const trackUris = [];
    for (const track of playlistData.tracks) {
      const searchResults = await spotifyApi.searchTracks(`track:${track.name} artist:${track.artist}`);
      if (searchResults.body.tracks.items.length > 0) {
        trackUris.push(searchResults.body.tracks.items[0].uri);
      }
    }

    await spotifyApi.addTracksToPlaylist(playlist.body.id, trackUris);

    res.json({ success: true, playlistUrl: playlist.body.external_urls.spotify });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
};
