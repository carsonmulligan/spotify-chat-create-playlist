import SpotifyWebApi from 'spotify-web-api-node';
import OpenAI from "openai";

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const spotifyLogin = (req, res) => {
  const scopes = ['playlist-modify-private', 'playlist-modify-public'];
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
};

export const spotifyCallback = async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;

  if (!state || state !== storedState) {
    console.error('State mismatch in Spotify callback');
    return res.redirect('/#error=state_mismatch');
  }

  res.clearCookie('spotify_auth_state');

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;

    res.cookie('spotify_access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expires_in * 1000
    });

    res.cookie('spotify_refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    res.redirect(process.env.FRONTEND_URI || 'http://localhost:3000');
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    res.redirect('/#error=spotify_auth_error');
  }
};

export const chatWithOpenAI = async (req, res) => {
  console.log('Received chat request:', req.body);
  
  try {
    console.log('Sending request to OpenAI');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {"role": "system", "content": "You are a helpful assistant that creates Spotify playlists."},
        {"role": "user", "content": req.body.message}
      ],
      stream: true,
    });

    console.log('Received stream from OpenAI, starting to write response');

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    let fullResponse = '';

    for await (const chunk of completion) {
      if (chunk.choices[0].delta.content) {
        const content = chunk.choices[0].delta.content;
        console.log('Sending chunk:', content);
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    console.log('Finished streaming response');
    console.log('Full response:', fullResponse);
    res.write(`data: ${JSON.stringify({ content: '[DONE]' })}\n\n`);
    res.end();

  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.', details: error.message });
  }
};
