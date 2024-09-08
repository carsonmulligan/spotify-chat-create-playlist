import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import session from 'express-session';
import passport from 'passport';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.NODE_ENV === 'production' 
        ? 'https://artur-ai-spotify-9fc02bcaa55b.herokuapp.com/callback'
        : 'http://localhost:3000/callback'
});

app.use(express.static('public'));
app.use(express.json());
app.use(session({ 
    secret: process.env.SESSION_SECRET || 'fallback_secret_for_development', 
    resave: false, 
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new SpotifyStrategy(
    {
      clientID: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'production' 
        ? 'https://artur-ai-spotify-9fc02bcaa55b.herokuapp.com/callback'
        : 'http://localhost:3000/callback',
    },
    function(accessToken, refreshToken, expires_in, profile, done) {
      spotifyApi.setAccessToken(accessToken);
      spotifyApi.setRefreshToken(refreshToken);
      return done(null, { profile, accessToken, refreshToken });
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/auth/spotify', passport.authenticate('spotify', {
    scope: ['user-read-email', 'playlist-modify-public', 'playlist-modify-private'],
    showDialog: true
}));

app.get('/callback',
    passport.authenticate('spotify', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/');
    }
);

app.get('/auth-status', (req, res) => {
    res.json({ authenticated: req.isAuthenticated() });
});

app.post('/api/create-playlist', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { prompt } = req.body;

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful assistant that suggests songs for playlists." },
                { role: "user", content: `Suggest 10 songs for a playlist with the following description: ${prompt}` }
            ],
        });

        const suggestedSongs = completion.choices[0].message.content.split('\n');

        const user = await spotifyApi.getMe();
        const playlist = await spotifyApi.createPlaylist(user.body.id, `AI Generated: ${prompt}`, { public: false });

        for (const song of suggestedSongs) {
            const searchResults = await spotifyApi.searchTracks(song);
            if (searchResults.body.tracks.items.length > 0) {
                await spotifyApi.addTracksToPlaylist(playlist.body.id, [searchResults.body.tracks.items[0].uri]);
            }
        }

        res.json({ success: true, playlistUrl: playlist.body.external_urls.spotify });
    } catch (err) {
        console.error('Error creating playlist', err);
        res.status(500).json({ error: 'Failed to create playlist' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
