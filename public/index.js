let accessToken = null;

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
    
    if (accessToken) {
        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
        result.innerHTML = '<p>Successfully logged in to Spotify!</p>';
    } else if (params.get('error')) {
        result.innerHTML = `<p>Error: ${decodeURIComponent(params.get('error'))}</p>`;
    }

    window.location.hash = '';
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
            body: JSON.stringify({ prompt, accessToken })
        });

        if (!response.ok) throw new Error('Failed to create playlist');
        
        const data = await response.json();

        if (data.success) {
            result.innerHTML = `<p>Playlist created successfully! You can view it <a href="${data.playlistUrl}" target="_blank">here</a>.</p>`;
        } else {
            result.textContent = `Error: ${data.error}`;
        }
    } catch (error) {
        console.error('Error:', error);
        result.textContent = 'An error occurred while creating the playlist.';
    }
});