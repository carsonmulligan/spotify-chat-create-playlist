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
    } catch (error) {
        console.error('Error:', error);
        result.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});