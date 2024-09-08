document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generate-button');
    const queryInput = document.getElementById('query-input');
    const loadingBar = document.getElementById('loading-bar');
    const resultDiv = document.getElementById('result');

    generateButton.addEventListener('click', async () => {
        const query = queryInput.value.trim();
        if (!query) {
            alert('Please enter a playlist description.');
            return;
        }

        generateButton.disabled = true;
        loadingBar.textContent = '';
        resultDiv.textContent = '';

        try {
            await simulateLoading();
            const playlist = await generatePlaylist(query);
            displayResult(playlist);
        } catch (error) {
            resultDiv.textContent = `Error: ${error.message}`;
        } finally {
            generateButton.disabled = false;
        }
    });

    async function simulateLoading() {
        const stages = [
            'Analyzing prompt...',
            'Searching Spotify database...',
            'Curating tracks...',
            'Finalizing playlist...'
        ];

        for (const stage of stages) {
            loadingBar.textContent = stage;
            await new Promise(resolve => setTimeout(resolve, 1500));
            loadingBar.textContent += ' Done!\n';
        }
    }

    async function generatePlaylist(query) {
        // Replace this with actual API call to your server
        const response = await fetch('/api/create-playlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: query }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate playlist');
        }

        return response.json();
    }

    function displayResult(playlist) {
        resultDiv.innerHTML = `
            <h2>Your Playlist is Ready!</h2>
            <p>Playlist URL: <a href="${playlist.playlistUrl}" target="_blank">${playlist.playlistUrl}</a></p>
        `;
    }
});