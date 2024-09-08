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
            // Get AI suggestions
            const chatResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });
            const chatData = await chatResponse.json();

            // Create playlist
            const createPlaylistResponse = await fetch(`/api/create-playlist?access_token=${accessToken}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: `AI Playlist: ${prompt}`,
                    description: `Created with AI based on the prompt: ${prompt}`,
                    tracks: chatData.response.split('\n'),
                }),
            });
            const playlistData = await createPlaylistResponse.json();

            result.innerHTML = `Playlist created successfully! ID: ${playlistData.playlistId}`;
        } catch (error) {
            console.error('Error:', error);
            result.innerHTML = 'An error occurred while creating the playlist.';
        }
    });
});