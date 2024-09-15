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
    const prompt = playlistPrompt.value;

    try {
        result.innerHTML = '<p>Creating playlist...</p>';

        const response = await fetch('/api/create-playlist', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (response.status === 403 && data.error.includes('Playlist limit reached')) {
            result.innerHTML = `<p>${data.error}</p><button id="subscribe-button">Subscribe Now</button>`;
            document.getElementById('subscribe-button').addEventListener('click', () => {
                fetch('/create-checkout-session', {
                    method: 'POST',
                })
                .then(response => response.json())
                .then(session => {
                    return stripe.redirectToCheckout({ sessionId: session.id });
                })
                .then(result => {
                    if (result.error) {
                        alert(result.error.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            });
        } else if (response.ok) {
            result.innerHTML = `<p>Playlist created successfully! You can view it <a href="${data.playlistUrl}" target="_blank">here</a>.</p>`;
        } else {
            result.innerHTML = `<p>Error: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('Error:', error);
        result.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});