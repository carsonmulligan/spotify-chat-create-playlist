let accessToken = null;
let playlistCount = 0;
const MAX_FREE_PLAYLISTS = 3;
const stripe = Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const loginButton = document.getElementById('login-button');
const playlistCreator = document.getElementById('playlist-creator');
const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');
const promptExamples = document.querySelectorAll('.prompt-example');
const upgradeButton = document.getElementById('upgrade-button');
const playlistCountMessage = document.getElementById('playlist-count-message');

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
        
        // Fetch the user profile using the correct access token
        fetch(`/api/me?access_token=${accessToken}`)
          .then(response => response.json())
          .then(data => {
            console.log('User profile:', data);
            result.innerHTML += `<p>Welcome, ${data.display_name}!</p>`;
          })
          .catch(error => {
            console.error('Error fetching user profile:', error);
            result.innerHTML += `<p>Error fetching user profile: ${error.message}</p>`;
          });
    } else if (params.get('error')) {
        result.innerHTML = `<p>Error: ${params.get('error')}</p>`;
    }

    window.location.hash = '';
};

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
    if (playlistCount >= MAX_FREE_PLAYLISTS) {
        upgradeButton.style.display = 'block';
        playlistCountMessage.textContent = 'You have reached the limit of free playlists. Please upgrade to Pro to create more.';
        return;
    }

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
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let playlistData = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            playlistData += chunk;
            result.innerHTML = `<p>Generating playlist: ${playlistData}</p>`;
        }

        const data = JSON.parse(playlistData);
        result.innerHTML = `<p>Playlist created successfully! You can view it <a href="${data.playlistUrl}" target="_blank">here</a>.</p>`;
        playlistCount++;
        updatePlaylistCountMessage();
    } catch (error) {
        console.error('Error:', error);
        result.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});

upgradeButton.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
        });
        const session = await response.json();
        const result = await stripe.redirectToCheckout({
            sessionId: session.id,
        });
        if (result.error) {
            alert(result.error.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
});

function updatePlaylistCountMessage() {
    if (playlistCount < MAX_FREE_PLAYLISTS) {
        playlistCountMessage.textContent = `You have created ${playlistCount} out of ${MAX_FREE_PLAYLISTS} free playlists.`;
    } else {
        playlistCountMessage.textContent = 'You have reached the limit of free playlists. Please upgrade to Pro to create more.';
        upgradeButton.style.display = 'block';
    }
}

// Call this function when the page loads to initialize the message
updatePlaylistCountMessage();