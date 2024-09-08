let accessToken = null;

const loginButton = document.getElementById('login-button');
const playlistCreator = document.getElementById('playlist-creator');
const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');
const promptExamples = document.querySelectorAll('.prompt-example');

// Check if user has logged in (using hash)
window.onload = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    
    if (accessToken) {
        playlistCreator.style.display = 'block';
    } else {
        // If no access token, redirect to landing/login page
        window.location.href = '/';
    }

    window.location.hash = '';
};

// Handle prompt example clicks
promptExamples.forEach(example => {
    example.addEventListener('click', (e) => {
        e.preventDefault();
        playlistPrompt.value = e.target.textContent;
    });
});

// Handle playlist creation
createPlaylistButton.addEventListener('click', async () => {
    const prompt = playlistPrompt.value;
    
    try {
        result.innerHTML = '<p>Creating playlist...</p>';
        
        const response = await fetch('/api/create-playlist', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                accessToken: accessToken // Ensure accessToken is passed correctly
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create playlist');
        }
        
        result.innerHTML = `<p>Playlist created! View it <a href="https://open.spotify.com/playlist/${data.playlistId}" target="_blank">here</a>.</p>`;
    } catch (error) {
        result.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});
