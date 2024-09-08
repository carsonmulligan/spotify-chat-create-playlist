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

// Serve static files (including landing.html)
app.use(express.static('public'));

// Update session middleware
app.use(session({ 
    secret: process.env.SESSION_SECRET || 'fallback_secret_for_development', 
    resave: false, 
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

// Configure Spotify authentication strategy
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
      console.log('Spotify strategy callback');
      console.log('Access Token:', accessToken);
      console.log('Refresh Token:', refreshToken);
      console.log('Expires In:', expires_in);
      
      // Manually fetch the user profile
      fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      .then(response => response.json())
      .then(data => {
        console.log('Manually fetched profile:', JSON.stringify(data, null, 2));
        return done(null, { profile: data, accessToken, refreshToken });
      })
      .catch(error => {
        console.error('Error fetching profile:', error);
        return done(error);
      });
    }
  )
);

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Add this middleware for logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Update the Spotify auth route
app.get('/login', passport.authenticate('spotify', {
  scope: ['user-read-email', 'user-read-private', 'playlist-modify-public', 'playlist-modify-private'],
  showDialog: true
}));

// Update the callback route
app.get('/callback',
    (req, res, next) => {
        console.log('Callback route hit');
        console.log('Query parameters:', req.query);
        next();
    },
    (req, res, next) => {
        passport.authenticate('spotify', (err, user, info) => {
            if (err) {
                console.error('Authentication error:', err);
                return res.redirect('/');
            }
            if (!user) {
                console.log('Authentication failed:', info);
                return res.redirect('/');
            }
            req.logIn(user, (err) => {
                if (err) {
                    console.error('Login error:', err);
                    return res.redirect('/');
                }
                console.log('Authentication successful');
                console.log('User:', user);
                return res.redirect('/app');
            });
        })(req, res, next);
    }
);

// Route to fetch user profile
app.get('/api/me', async (req, res) => {
    try {
        const { access_token } = req.query;
        spotifyApi.setAccessToken(access_token);
        const data = await spotifyApi.getMe();
        res.json(data.body);
    } catch (err) {
        console.error('Error fetching user profile', err);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Route to create a playlist
app.post('/api/create-playlist', express.json(), async (req, res) => {
    const { prompt } = req.body;

    try {
        // Use OpenAI to generate playlist suggestions
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful assistant that suggests songs for playlists." },
                { role: "user", content: `Suggest 10 songs for a playlist with the following description: ${prompt}` }
            ],
        });

        const suggestedSongs = completion.choices[0].message.content.split('\n');

        // Use Spotify API to create a playlist with the suggested songs
        const user = await spotifyApi.getMe();
        const playlist = await spotifyApi.createPlaylist(user.body.id, `AI Generated: ${prompt}`, { public: false });

        // Search for and add each suggested song to the playlist
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

// Route to handle successful authentication redirect
app.get('/app', (req, res) => {
    if (req.isAuthenticated()) {
        res.sendFile(path.join(__dirname, 'public', 'app.html'));
    } else {
        res.redirect('/');
    }
});

// Update the catch-all route
app.use((req, res) => {
    console.log(`404: ${req.method} ${req.url}`);
    res.status(404).send('Not Found');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Route to check the current session
app.get('/check-session', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ authenticated: true, user: req.user });
    } else {
        res.json({ authenticated: false });
    }
});
