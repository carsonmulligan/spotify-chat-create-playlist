document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('login-button');
    const playlistCreator = document.getElementById('playlist-creator');
    const result = document.getElementById('result');

    loginButton.addEventListener('click', () => {
        window.location.href = '/login';
    });

    // Check if user is already authenticated
    const accessToken = localStorage.getItem('spotifyAccessToken');
    if (accessToken) {
        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
    }

    // Handle playlist creation
    const createPlaylistButton = document.getElementById('create-playlist-button');
    createPlaylistButton.addEventListener('click', async () => {
        const prompt = document.getElementById('playlist-prompt').value;
        try {
            const response = await fetch('/api/create-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt, accessToken }),
            });
            const data = await response.json();
            if (data.success) {
                result.innerHTML = `Playlist created! <a href="${data.playlistUrl}" target="_blank">Open in Spotify</a>`;
            } else {
                result.innerHTML = 'Failed to create playlist. Please try again.';
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            result.innerHTML = 'An error occurred. Please try again.';
        }
    });

    // Handle prompt examples
    const promptExamples = document.querySelectorAll('.prompt-example');
    promptExamples.forEach(example => {
        example.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('playlist-prompt').value = e.target.textContent;
        });
    });
});
