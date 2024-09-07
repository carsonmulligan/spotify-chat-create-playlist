document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('login-button');
    const createPlaylistButton = document.getElementById('create-playlist-button');
    const playlistNameInput = document.getElementById('playlist-name');
    const playlistDescriptionInput = document.getElementById('playlist-description');
    const statusMessage = document.getElementById('status-message');

    let accessToken = null;
    let refreshToken = null;

    // Check if we have tokens in the URL (after login redirect)
    const hashParams = new URLSearchParams(window.location.hash.substr(1));
    accessToken = hashParams.get('access_token');
    refreshToken = hashParams.get('refresh_token');

    if (accessToken) {
        // We have an access token, so the user is logged in
        loginButton.style.display = 'none';
        createPlaylistButton.style.display = 'block';
        statusMessage.textContent = 'Logged in successfully!';
    }

    loginButton.addEventListener('click', () => {
        // Redirect to the server's login route
        window.location.href = '/login';
    });

    createPlaylistButton.addEventListener('click', async () => {
        const name = playlistNameInput.value;
        const description = playlistDescriptionInput.value;

        if (!name) {
            statusMessage.textContent = 'Please enter a playlist name.';
            return;
        }

        try {
            const response = await fetch('/api/create-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ name, description, tracks: [] }) // You can add logic to include tracks later
            });

            if (!response.ok) {
                throw new Error('Failed to create playlist');
            }

            const data = await response.json();
            statusMessage.textContent = `Playlist created successfully! ID: ${data.playlistId}`;
        } catch (error) {
            console.error('Error creating playlist:', error);
            statusMessage.textContent = 'Failed to create playlist. Please try again.';
        }
    });
});