let accessToken = null;

const loginButton = document.getElementById('login-button');
const playlistCreator = document.getElementById('playlist-creator');
const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');
const promptExamples = document.querySelectorAll('.prompt-example');
const logoutButton = document.createElement('button');

// Check if user has logged in (using hash)
window.onload = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    
    if (accessToken) {
        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
        result.innerHTML = '<p>Successfully logged in to Spotify!</p>';

        // Add Logout Button
        logoutButton.textContent = 'Logout';
        logoutButton.style.marginTop = '20px';
        logoutButton.style.display = 'block';
        document.body.appendChild(logoutButton);
    } else if (params.get('error')) {
        result.innerHTML = `<p>Error: ${params.get('error')}</p>`;
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

// Logout function to clear the access token and reload the page
logoutButton.addEventListener('click', () => {
    accessToken = null;
    localStorage.clear(); // Clear any stored tokens
    result.innerHTML = '<p>Logged out. Redirecting to login...</p>';
    
    setTimeout(() => {
        window.location.href = '/'; // Redirect back to landing page or login
    }, 1000);
});
