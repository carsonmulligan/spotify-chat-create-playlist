import express from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';
const session = require('express-session');
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI, // Ensure this is set in .env
});

// Serve static files
app.use(express.static('public'));

// Spotify Login Route
app.get('/login', (req, res) => {
    const scopes = ['user-read-private', 'user-read-email', 'playlist-modify-public', 'playlist-modify-private'];
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    res.redirect(authorizeURL);
});

// Spotify Callback Route
app.get('/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        const accessToken = data.body['access_token'];
        const refreshToken = data.body['refresh_token'];

        // Redirect to the main app page with the access token in the URL hash
        res.redirect(`/index.html#access_token=${accessToken}`);
    } catch (err) {
        console.error('Error getting tokens', err);
        res.redirect('/?error=invalid_token');
    }
});

// Fetch user profile route
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

// Handle playlist creation
app.post('/api/create-playlist', express.json(), async (req, res) => {
    const { prompt, accessToken } = req.body;

    try {
        spotifyApi.setAccessToken(accessToken);

        // Create playlist (logic for AI playlist generation should be added here)
        const playlist = await spotifyApi.createPlaylist('Generated Playlist', { description: prompt, public: false });

        res.json({ success: true, playlistUrl: playlist.body.external_urls.spotify });
    } catch (err) {
        console.error('Error creating playlist', err);
        res.status(500).json({ error: 'Failed to create playlist' });
    }
});

// Set up Spotify authentication strategy
passport.use(
  new SpotifyStrategy(
    {
      clientID: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/spotify/callback',
    },
    function(accessToken, refreshToken, expires_in, profile, done) {
      // Save the tokens and user info in the session
      return done(null, { profile, accessToken, refreshToken });
    }
  )
);

// Serialize user for the session
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Set up session middleware
app.use(session({ secret: 'your_session_secret', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Spotify auth routes
app.get('/auth/spotify', passport.authenticate('spotify', {
  scope: ['user-read-email', 'playlist-modify-public', 'playlist-modify-private']
}));

app.get('/auth/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to the main app page
    res.redirect('/app');
  }
);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
