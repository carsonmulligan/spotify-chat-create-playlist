document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('login-button');
    const playlistCreator = document.getElementById('playlist-creator');
    const createPlaylistButton = document.getElementById('create-playlist-button');
    const playlistPrompt = document.getElementById('playlist-prompt');
    const result = document.getElementById('result');

    // Check if user is authenticated
    const params = new URLSearchParams(window.location.hash.substr(1));
    const accessToken = params.get('access_token');

    if (accessToken) {
        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
    }

    loginButton.addEventListener('click', () => {
        window.location.href = '/login';
    });

    createPlaylistButton.addEventListener('click', async () => {
        const prompt = playlistPrompt.value;
        if (!prompt) {
            alert('Please enter a prompt for your playlist.');
            return;
        }

        try {
            // Generate playlist using GPT
            const generateResponse = await fetch('/api/generate-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });
            const playlistData = await generateResponse.json();

            // Create playlist on Spotify
            const createPlaylistResponse = await fetch('/api/create-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,
                    accessToken,
                    refreshToken: params.get('refresh_token'),
                    playlistData,
                }),
            });
            const createdPlaylist = await createPlaylistResponse.json();

            result.innerHTML = `Playlist created successfully! <a href="${createdPlaylist.playlistUrl}" target="_blank">Open in Spotify</a>`;
        } catch (error) {
            console.error('Error:', error);
            result.innerHTML = 'An error occurred while creating the playlist.';
        }
    });
});