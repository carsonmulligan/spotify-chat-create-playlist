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
    accessToken = params.get('access_token');
    refreshToken = params.get('refresh_token');
    const expiresIn = params.get('expires_in');
    
    if (accessToken) {
        tokenExpiryTime = Date.now() + expiresIn * 1000;
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_refresh_token', refreshToken);
        localStorage.setItem('spotify_token_expiry', tokenExpiryTime);

        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
        result.innerHTML = '<p>Successfully logged in to Spotify!</p>';
        
        fetchUserProfile();
    } else if (params.get('error')) {
        result.innerHTML = `<p>Error: ${params.get('error')}</p>`;
    } else {
        // Check if we have a stored token
        accessToken = localStorage.getItem('spotify_access_token');
        refreshToken = localStorage.getItem('spotify_refresh_token');
        tokenExpiryTime = localStorage.getItem('spotify_token_expiry');
        
        if (accessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
            loginButton.style.display = 'none';
            playlistCreator.style.display = 'block';
            fetchUserProfile();
        }
    }

    window.location.hash = '';
};

function fetchUserProfile() {
    fetch('/api/me', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('User profile:', data);
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
        // If there's an error, we might need to refresh the token
        refreshAccessToken();
    });
}

function refreshAccessToken() {
    return fetch('/refresh_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
    })
    .then(response => response.json())
    .then(data => {
        accessToken = data.access_token;
        tokenExpiryTime = Date.now() + data.expires_in * 1000;
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_token_expiry', tokenExpiryTime);
        console.log('Access token refreshed');
        return accessToken;
    })
    .catch(error => {
        console.error('Error refreshing token:', error);
        // If refreshing fails, redirect to login
        window.location.href = '/login';
    });
}

// After successful authentication
fetch(`/api/me?access_token=${accessToken}`)
  .then(response => response.json())
  .then(data => {
    console.log('User profile:', data);
    // Now you can proceed with playlist creation
  })
  .catch(error => {
    console.error('Error fetching user profile:', error);
  });

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
        
        // Always refresh the token before making a request
        await refreshAccessToken();

        const response = await fetch('/api/create-playlist', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ prompt })
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