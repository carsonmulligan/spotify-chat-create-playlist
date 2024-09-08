import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const openai = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export const generatePlaylistFromGPT = async (prompt) => {
  try {
    const response = await openai.post('/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            "You are a helpful assistant that creates Spotify playlists. Respond with a JSON object containing 'name', 'description', and 'tracks' (an array of objects with 'name' and 'artist' properties). Include up to 99 tracks.",
        },
        {
          role: 'user',
          content: `Create a playlist based on this description: ${prompt}`,
        },
      ],
    });

    const completion = response.data.choices[0].message.content;
    return JSON.parse(completion); // Structured playlist data
  } catch (error) {
    console.error('Error generating playlist with GPT:', error);
    throw error;
  }
};
