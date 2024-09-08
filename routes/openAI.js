import OpenAI from 'openai';
import dotenv from 'dotenv';

// User Journey:
// 1. User enters a prompt for playlist creation
// 2. This module processes the prompt using OpenAI's API
// 3. Returns song suggestions based on the prompt

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const chat = async (req, res) => {
  const { prompt } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that suggests songs for playlists." },
        { role: "user", content: prompt }
      ],
    });

    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Error processing your request' });
  }
};
