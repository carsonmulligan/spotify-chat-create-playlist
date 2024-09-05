let accessToken = null;
let refreshToken = null;
let tokenExpiryTime = null;

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
    accessToken = params.get('access_token') || localStorage.getItem('spotify_access_token');
    refreshToken = params.get('refresh_token') || localStorage.getItem('spotify_refresh_token');
    const expiresIn = params.get('expires_in');
    
    if (accessToken) {
        tokenExpiryTime = expiresIn ? Date.now() + expiresIn * 1000 : localStorage.getItem('spotify_token_expiry');
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_refresh_token', refreshToken);
        localStorage.setItem('spotify_token_expiry', tokenExpiryTime);

        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
        result.innerHTML = '<p>Successfully logged in to Spotify!</p>';
        
        // Clear the hash to remove tokens from URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error')) {
        result.innerHTML = `<p>Error: ${params.get('error')}</p>`;
    } else {
        loginButton.style.display = 'block';
        playlistCreator.style.display = 'none';
    }
};

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
                prompt,
                accessToken,
                refreshToken
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to create playlist');
        }
        
        const data = await response.json();
        if (data.newAccessToken) {
            accessToken = data.newAccessToken;
            localStorage.setItem('spotify_access_token', accessToken);
        }
        result.innerHTML = `
            <p>Playlist created successfully!</p>
            <p>You can view it <a href="${data.playlistUrl}" target="_blank">here</a>.</p>
        `;
    } catch (error) {
        console.error('Error:', error);
        result.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});