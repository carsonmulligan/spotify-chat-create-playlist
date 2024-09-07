// Initialize access and refresh tokens
let accessToken = null;
let refreshToken = null;

// Get references to DOM elements
const loginButton = document.getElementById('login-button');
const playlistCreator = document.getElementById('playlist-creator');
const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');
const promptExamples = document.querySelectorAll('.prompt-example');

// Set up login button click handler
loginButton.addEventListener('click', () => {
    window.location.href = '/login'; // Redirect to backend login route
});

// Handle page load and authentication callback
window.onload = () => {
    // Extract tokens from URL fragment after Spotify auth
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    refreshToken = params.get('refresh_token');
    
    if (accessToken) {
        // If we have an access token, hide login and show playlist creator
        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
        result.innerHTML = '<p>Successfully logged in to Spotify!</p>';
    } else if (params.get('error')) {
        // Handle any authentication errors
        result.innerHTML = `<p>Error: ${decodeURIComponent(params.get('error'))}</p>`;
    }

    // Clear the URL fragment
    window.location.hash = '';
};

// Function to refresh the access token
async function refreshAccessToken() {
    try {
        const response = await fetch(`/refresh_token?refresh_token=${refreshToken}`);
        const data = await response.json();
        if (data.access_token) {
            accessToken = data.access_token;
            return true;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
    }
    return false;
}

// Ensure we have a valid token before making API calls
async function ensureValidToken() {
    if (!accessToken) {
        return false;
    }
    // Attempt to refresh the token if it's expired
    return await refreshAccessToken();
}

// Set up click handlers for prompt examples
promptExamples.forEach(example => {
    example.addEventListener('click', (e) => {
        e.preventDefault();
        playlistPrompt.value = e.target.textContent; // Fill prompt with example text
    });
});

// Handle playlist creation
createPlaylistButton.addEventListener('click', async () => {
    const prompt = playlistPrompt.value;
    
    try {
        result.innerHTML = '<p>Creating playlist...</p>';
        
        // Send request to backend to create playlist
        const response = await fetch('/api/create-playlist', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                prompt: prompt,
                accessToken: accessToken
            })
        });

        if (!response.ok) throw new Error('Failed to create playlist');
        
        const data = await response.json();

        if (data.success) {
            // Display success message with link to created playlist
            result.innerHTML = `<p>Playlist created successfully! You can view it <a href="${data.playlistUrl}" target="_blank">here</a>.</p>`;
        } else {
            result.textContent = `Error: ${data.error}`;
        }
    } catch (error) {
        console.error('Error:', error);
        result.textContent = 'An error occurred while creating the playlist.';
    }
});