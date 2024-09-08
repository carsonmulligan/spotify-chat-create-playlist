let accessToken = null;
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const playlistCreator = document.getElementById('playlist-creator');
const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');
const promptExamples = document.querySelectorAll('.prompt-example');

// Fetch access token from URL hash
window.onload = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    
    if (accessToken) {
        // If access token exists, hide login button and show playlist creator
        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
        result.innerHTML = '<p>Successfully logged in to Spotify!</p>';
        
        // Fetch user profile
        fetch(`/api/me?access_token=${accessToken}`)
          .then(response => response.json())
          .then(data => {
            console.log('User profile:', data);
          })
          .catch(error => {
            console.error('Error fetching user profile:', error);
          });
    } else if (params.get('error')) {
        result.innerHTML = `<p>Error: ${params.get('error')}</p>`;
    }

    window.location.hash = ''; // Clear the hash after processing
};

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
                accessToken: accessToken
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to create playlist');
        }
        
        const data = await response.json();
        result.innerHTML = `<p>Playlist created successfully! You can view it <a href="${data.playlistUrl}" target="_blank">here</a>.</p>`;
    } catch (error) {
        console.error('Error:', error);
        result.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});

// Handle prompt examples
promptExamples.forEach(example => {
    example.addEventListener('click', (e) => {
        e.preventDefault();
        playlistPrompt.value = e.target.textContent;
    });
});

// Logout functionality
logoutButton.addEventListener('click', () => {
    accessToken = null;
    window.location.href = '/'; // Redirect to landing page
});
