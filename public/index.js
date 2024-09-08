let accessToken = null;

const loginButton = document.getElementById('login-button');
const playlistCreator = document.getElementById('playlist-creator');
const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');
const promptExamples = document.querySelectorAll('.prompt-example');

// Event listener for login button
loginButton.addEventListener('click', () => {
    window.location.href = '/login';
});

// When the window loads, check if we have an access token
window.onload = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    
    if (accessToken) {
        console.log('New Access Token:', accessToken);
        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
        result.innerHTML = '<p>Successfully logged in to Spotify!</p>';
        fetchUserProfile();
    } else if (params.get('error')) {
        result.innerHTML = `<p>Error: ${params.get('error')}</p>`;
    }

    window.location.hash = ''; // Clear the hash
};

// Function to fetch the user profile
function fetchUserProfile() {
    if (!accessToken) {
        console.error('No access token available');
        return;
    }

    // Fetch user profile using the access token
    fetch(`/api/me?access_token=${accessToken}`)
        .then(response => response.json())
        .then(data => {
            console.log('User profile:', data);
            if (data.error) {
                console.error('Error fetching user profile:', data.error);
            }
        })
        .catch(error => {
            console.error('Error fetching user profile:', error);
        });
}

// Add event listener for example prompts
promptExamples.forEach(example => {
    example.addEventListener('click', (e) => {
        e.preventDefault();
        playlistPrompt.value = e.target.textContent;
    });
});

// Add event listener to create the playlist
createPlaylistButton.addEventListener('click', async () => {
    const prompt = playlistPrompt.value;
    
    if (!accessToken) {
        result.innerHTML = '<p>Please log in to create a playlist.</p>';
        return;
    }
    
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
