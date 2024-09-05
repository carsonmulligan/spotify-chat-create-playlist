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

window.onload = async () => {
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
        
        try {
            const userProfile = await fetchUserProfile();
            console.log('User profile:', userProfile);
            // You can display user information here if needed
        } catch (error) {
            console.error('Error fetching user profile:', error);
            result.innerHTML = '<p>Error fetching user profile. Please try logging in again.</p>';
            loginButton.style.display = 'block';
            playlistCreator.style.display = 'none';
        }
    } else {
        console.log('No access token found, displaying login button');
        loginButton.style.display = 'block';
        playlistCreator.style.display = 'none';
    }

    window.location.hash = '';
};

async function fetchUserProfile() {
    try {
        console.log('Fetching user profile with access token:', accessToken);
        const response = await fetch('/api/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            if (response.status === 401) {
                console.log('Token expired or invalid, refreshing...');
                await refreshAccessToken();
                return fetchUserProfile(); // Retry after refreshing
            }
            throw new Error(errorData.error || 'Failed to fetch user profile');
        }
        const data = await response.json();
        console.log('User profile:', data);
        return data;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        // If there's an error even after refreshing, redirect to login
        window.location.href = '/login';
    }
}

async function refreshAccessToken() {
    try {
        const response = await fetch('/refresh_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }
        const data = await response.json();
        accessToken = data.access_token;
        tokenExpiryTime = Date.now() + data.expires_in * 1000;
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_token_expiry', tokenExpiryTime);
        console.log('Access token refreshed');
    } catch (error) {
        console.error('Error refreshing token:', error);
        // If refreshing fails, clear stored tokens and redirect to login
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_token_expiry');
        window.location.href = '/login';
    }
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
            body: JSON.stringify({ prompt, refresh_token: refreshToken })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to create playlist');
        }
        
        const data = await response.json();
        result.innerHTML = `
            <p>Playlist "${data.playlistName}" created successfully with ${data.trackCount} tracks!</p>
            <p>You can view it <a href="${data.playlistUrl}" target="_blank">here</a>.</p>
        `;
    } catch (error) {
        console.error('Error:', error);
        result.innerHTML = `<p>Error: ${error.message}</p>`;
        // If there's an error, try logging in again
        loginButton.style.display = 'block';
        playlistCreator.style.display = 'none';
    }
});