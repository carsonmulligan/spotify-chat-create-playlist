let accessToken = null;
let stripe; // Remove 'let' from here as it's already declared

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
        localStorage.setItem('spotify_access_token', accessToken);
        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
        result.innerHTML = '<p>Successfully logged in to Spotify!</p>';
        
        fetchUserProfile();
    } else if (params.get('error')) {
        result.innerHTML = `<p>Error: ${params.get('error')}</p>`;
    } else {
        // Check if we have a stored access token
        accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            loginButton.style.display = 'none';
            playlistCreator.style.display = 'block';
            fetchUserProfile();
        }
    }

    window.location.hash = '';
};

function fetchUserProfile() {
    fetch(`/api/me`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('User profile:', data);
        result.innerHTML += `<p>Welcome, ${data.display_name}!</p>`;
    })
    .catch(error => {
        console.error('Error fetching user profile:', error);
        result.innerHTML += `<p>Error fetching user profile: ${error.message}</p>`;
    });
}

// Replace the existing Stripe initialization code with this:
if (!stripe) {
    fetch('/config')
        .then((response) => response.json())
        .then((data) => {
            console.log('Stripe publishable key:', data.publishableKey);
            stripe = Stripe(data.publishableKey);
        })
        .catch((error) => {
            console.error('Error loading Stripe config:', error);
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

        if (response.status === 403) {
            console.log('Playlist limit reached, creating checkout session');
            
            const sessionResponse = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({})
            });

            if (!sessionResponse.ok) {
                const errorData = await sessionResponse.json();
                throw new Error(`Failed to create checkout session: ${errorData.error}`);
            }

            const session = await sessionResponse.json();
            console.log('Checkout session created:', session);

            if (!stripe) {
                throw new Error('Stripe has not been initialized');
            }

            const { error } = await stripe.redirectToCheckout({
                sessionId: session.id,
            });

            if (error) {
                console.error('Error redirecting to checkout:', error);
                throw error;
            }
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