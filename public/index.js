let accessToken = null;
let stripe;

const loginButton = document.getElementById('login-button');
const loginSection = document.getElementById('login-section');
const playlistCreator = document.getElementById('playlist-creator');
const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');
const subscribeButton = document.getElementById('subscribe-button');

loginButton.addEventListener('click', () => {
    window.location.href = '/login';
});

window.onload = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    
    if (accessToken) {
        localStorage.setItem('spotify_access_token', accessToken);
        showPlaylistCreator();
    } else {
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            showPlaylistCreator();
        } else {
            loginSection.style.display = 'block';
            playlistCreator.style.display = 'none';
        }
    }

    window.location.hash = '';
};

function showPlaylistCreator() {
    loginSection.style.display = 'none';
    playlistCreator.style.display = 'block';
    fetchUserProfile();
}

function fetchUserProfile() {
    fetch(`/api/me`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('User profile:', data);
        result.innerHTML = `<p>Welcome, ${data.display_name}!</p>`;
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
        result.innerHTML = `<p>Error fetching user profile: ${error.message}</p>`;
    });
}

fetch('/config')
    .then((response) => response.json())
    .then((data) => {
        console.log('Stripe publishable key:', data.publishableKey);
        stripe = Stripe(data.publishableKey);
    })
    .catch((error) => {
        console.error('Error loading Stripe config:', error);
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
            body: JSON.stringify({ prompt })
        });

        if (response.status === 403) {
            result.innerHTML = '<p>You have reached your free playlist limit. Please subscribe to create more playlists.</p>';
            return;
        }

        if (!response.ok) throw new Error('Failed to create playlist');
        
        const data = await response.json();
        result.innerHTML = `<p>Playlist created successfully! You can view it <a href="${data.playlistUrl}" target="_blank">here</a>.</p>`;
    } catch (error) {
        console.error('Error:', error);
        result.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});

subscribeButton.addEventListener('click', async () => {
    try {
        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }

        const session = await response.json();
        const result = await stripe.redirectToCheckout({
            sessionId: session.id,
        });

        if (result.error) {
            throw result.error;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to start subscription process. Please try again.');
    }
});