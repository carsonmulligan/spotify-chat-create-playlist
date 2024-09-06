document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('login-button');
    const createPlaylistForm = document.getElementById('create-playlist-form');
    const promptInput = document.getElementById('prompt-input');
    const resultDiv = document.getElementById('result');

    // Check for access token in URL fragment
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = params.get('expires_in');

    if (accessToken) {
        // Store tokens in localStorage
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('expires_in', expiresIn);
        localStorage.setItem('token_timestamp', Date.now());

        // Clear the hash from the URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Show the create playlist form and hide the login button
        loginButton.style.display = 'none';
        createPlaylistForm.style.display = 'block';
    } else {
        // If no access token, show the login button and hide the create playlist form
        loginButton.style.display = 'block';
        createPlaylistForm.style.display = 'none';
    }

    loginButton.addEventListener('click', () => {
        window.location.href = window.location.origin + '/login';
    });

    createPlaylistForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = promptInput.value;
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            alert('Please log in first');
            return;
        }

        try {
            resultDiv.textContent = 'Creating playlist...';
            const response = await fetch('/create-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt, accessToken }),
            });

            const data = await response.json();

            if (data.success) {
                resultDiv.innerHTML = `Playlist created successfully! <a href="${data.playlistUrl}" target="_blank">Open in Spotify</a>`;
            } else {
                resultDiv.textContent = `Error: ${data.error}`;
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            resultDiv.textContent = 'An error occurred while creating the playlist.';
        }
    });
});