import OpenAI from "openai";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    console.log('Sending request to OpenAI');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: req.body.message },
      ],
    });

    console.log('Received response from OpenAI');
    res.json({ message: completion.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI API Error:', error.response ? error.response.data : error.message);
    if (error.response && error.response.status === 401) {
      res.status(401).json({ error: 'Invalid API key. Please check your .env file.' });
    } else {
      res.status(500).json({ error: 'An error occurred while processing your request.', details: error.message });
    }
  }
});

app.listen(port, () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in the .env file. Please add it and restart the server.');
  } else {
    console.log(`Server running at http://localhost:${port}`);
  }
});