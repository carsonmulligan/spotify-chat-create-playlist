let accessToken = null;

const loginButton = document.getElementById('login-button');
const playlistCreator = document.getElementById('playlist-creator');
const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');

loginButton.addEventListener('click', () => {
    window.location.href = '/login';
});

window.onload = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    
    if (accessToken) {
        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
        result.innerHTML = '<p>Successfully logged in to Spotify!</p>';
    } else if (params.get('error')) {
        result.innerHTML = `<p>Error: ${params.get('error')}</p>`;
    }

    window.location.hash = '';
};

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
        
        const data = await response.json();
        result.innerHTML = `<p>Playlist created successfully! You can view it <a href="${data.playlistUrl}" target="_blank">here</a>.</p>`;
    } catch (error) {
        console.error('Error:', error);
        result.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});
