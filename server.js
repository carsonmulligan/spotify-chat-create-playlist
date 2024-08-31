import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

app.post('/api/chat', async (req, res) => {
  console.log('Received chat request:', req.body);
  
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in the .env file.');
    return res.status(500).json({ error: 'OPENAI_API_KEY is not set in the .env file.' });
  }

  try {
    console.log('Sending request to OpenAI');
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: req.body.message }
        ],
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Received stream from OpenAI, starting to write response');

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
          } else {
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                console.log('Sending chunk:', content);
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (error) {
              console.error('Error parsing JSON:', error);
            }
          }
        }
      }
    }

    console.log('Finished streaming response');
    res.end();

  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.', details: error.message });
  }
});

app.listen(port, () => {
  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in the .env file. Please add it and restart the server.');
  } else {
    console.log(`Server running at http://localhost:${port}`);
    console.log('OPENAI_API_KEY:', OPENAI_API_KEY.substring(0, 5) + '...');
  }
});

console.log('OPENAI_API_KEY:', OPENAI_API_KEY ? 'Set' : 'Not set');