let accessToken = null;
let refreshToken = null;

const loginButton = document.getElementById('login-button');
const playlistCreator = document.getElementById('playlist-creator');
const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');
const promptExamples = document.querySelectorAll('.prompt-example');

loginButton.addEventListener('click', () => {
    window.location.href = '/login';
});

window.onload = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    refreshToken = params.get('refresh_token');
    
    if (accessToken) {
        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
        result.innerHTML = '<p>Successfully logged in to Spotify!</p>';
    } else if (params.get('error')) {
        result.innerHTML = `<p>Error: ${decodeURIComponent(params.get('error'))}</p>`;
    }

    window.location.hash = '';
};

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

// Use this function before making any Spotify API calls
async function ensureValidToken() {
    if (!accessToken) {
        return false;
    }
    // Attempt to refresh the token if it's expired
    // You might want to check if the token is actually expired before refreshing
    return await refreshAccessToken();
}

// Example of how to use ensureValidToken
async function createPlaylist() {
    if (await ensureValidToken()) {
        // Make your Spotify API call here
    } else {
        console.error('Unable to get a valid token');
    }
}

promptExamples.forEach(example => {
    example.addEventListener('click', (e) => {
        e.preventDefault();
        playlistPrompt.value = e.target.textContent;
    });
});

createPlaylistButton.addEventListener('click', async () => {
    const prompt = playlistPrompt.value;
    
    try {
        result.innerHTML = '<p>Creating playlist...</p>';
        
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
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let playlistData = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            playlistData += chunk;
            result.innerHTML = `<p>Generating playlist: ${playlistData}</p>`;
        }

        const data = JSON.parse(playlistData);
        result.innerHTML = `<p>Playlist created successfully! You can view it <a href="${data.playlistUrl}" target="_blank">here</a>.</p>`;
    } catch (error) {
        console.error('Error:', error);
        result.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});