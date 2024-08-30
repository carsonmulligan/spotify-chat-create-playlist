require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(400).json({ error: 'API Key is required' });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: req.body.message },
      ],
    });

    res.json({ message: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});