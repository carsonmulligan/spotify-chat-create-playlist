export const createPlaylist = async (req, res) => {
  console.log('Received playlist creation request');
  const { prompt, accessToken } = req.body;

  try {
    console.log('Generating playlist with OpenAI');
    console.log('OpenAI API Key:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Change this from "gpt-4o-mini" to "gpt-3.5-turbo"
      messages: [
        {"role": "system", "content": "You are a helpful assistant that creates Spotify playlists. Respond with a JSON object containing 'name', 'description', and 'tracks' (an array of objects with 'name' and 'artist' properties). Include up to 99 tracks."},
        {"role": "user", "content": `Create a playlist based on this description: ${prompt}`}
      ],
      response_format: { type: "json_object" }
    });

    console.log('OpenAI response received');
    const playlistData = JSON.parse(completion.choices[0].message.content);
    console.log('Generated playlist:', playlistData);

    // ... rest of the function
  } catch (error) {
    console.error('Error creating playlist:', error);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    res.status(500).json({ error: 'Failed to create playlist', details: error.message });
  }
};