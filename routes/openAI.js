import OpenAI from 'openai'; // Import OpenAI API
import dotenv from 'dotenv'; // Import dotenv for environment variable management

dotenv.config(); // Load environment variables

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Initialize OpenAI with API key
});

export const generatePlaylistFromAI = async (prompt) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Specify the AI model to use
      messages: [
        {"role": "system", "content": "You are a helpful assistant that creates Spotify playlists. Respond with a JSON object containing 'name', 'description', and 'tracks' (an array of objects with 'name' and 'artist' properties). Include up to 20 tracks."},
        {"role": "user", "content": `Create a playlist based on this description: ${prompt}`}
      ],
      response_format: { type: "json_object" } // Specify JSON response format
    });

    return JSON.parse(completion.choices[0].message.content); // Parse and return the AI-generated playlist data
  } catch (error) {
    console.error('Error generating playlist from OpenAI:', error);
    throw error; // Propagate the error
  }
};

export { openai }; // Export openai instance for potential use elsewhere