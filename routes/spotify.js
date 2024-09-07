import SpotifyWebApi from 'spotify-web-api-node'; // Import Spotify Web API
import crypto from 'crypto'; // Import crypto for generating random state
import cookieParser from 'cookie-parser'; // Import cookie-parser for handling cookies

// Initialize Spotify API with credentials
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.NODE_ENV === 'production' 
    ? process.env.SPOTIFY_REDIRECT_URI 
    : 'http://localhost:3000/callback',
});

export const setupSpotifyRoutes = (app) => {
  app.use(cookieParser()); // Use cookie-parser middleware

  app.get('/login', (req, res) => {
    console.log('Using Spotify Client ID:', process.env.SPOTIFY_CLIENT_ID);
    console.log('Redirect URI:', spotifyApi.getRedirectURI());
    const state = crypto.randomBytes(16).toString('hex'); // Generate random state
    res.cookie('spotify_auth_state', state, { 
      httpOnly: true, 
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000 // 1 hour expiration
    }); // Set state cookie
    const scopes = ['playlist-modify-private', 'playlist-modify-public']; // Define Spotify API scopes
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state); // Create authorization URL
    
    // Ensure client_id is included in the URL
    const finalAuthorizeURL = `${authorizeURL}&client_id=${process.env.SPOTIFY_CLIENT_ID}&show_dialog=true`;
    
    console.log('Redirecting to:', finalAuthorizeURL);
    res.redirect(finalAuthorizeURL); // Redirect user to Spotify login
  });

  app.get('/callback', async (req, res) => {
    const { code, state } = req.query; // Get code and state from query params
    const storedState = req.cookies ? req.cookies['spotify_auth_state'] : null; // Get stored state from cookie

    if (state === null || state !== storedState) {
      console.error('State mismatch', { receivedState: state, storedState });
      return res.redirect('/#error=state_mismatch'); // Handle state mismatch error
    }

    res.clearCookie('spotify_auth_state'); // Clear the state cookie

    try {
      console.log('Attempting to exchange authorization code for tokens');
      console.log('Authorization code:', code);
      const data = await spotifyApi.authorizationCodeGrant(code); // Exchange code for tokens
      console.log('Token exchange successful');
      const { access_token, refresh_token, expires_in } = data.body;
      
      // Instead of storing tokens, redirect with them in the URL fragment
      res.redirect(`/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`); // Redirect with tokens
    } catch (err) {
      console.error('Error during Spotify callback:', err);
      console.error('Error details:', err.body);
      console.error('Spotify API configuration:', {
        clientId: spotifyApi.getClientId(),
        redirectUri: spotifyApi.getRedirectURI()
      });
      res.redirect('/#error=invalid_token'); // Handle token exchange error
    }
  });

  // Remove any token refresh routes if they exist
};

export { spotifyApi }; // Export spotifyApi for use in other files