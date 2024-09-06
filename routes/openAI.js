import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate a playlist from OpenAI
export const generatePlaylistFromAI = async (prompt) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates Spotify playlists.' },
        { role: 'user', content: `Create a playlist based on this description: ${prompt}` },
      ],
    });

    const playlistData = JSON.parse(completion.choices[0].message.content);
    return playlistData;
  } catch (error) {
    console.error('Error generating playlist from OpenAI:', error);
    throw error;
  }
};
