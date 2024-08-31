const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
    });
}

const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatOutput = document.getElementById('chat-output');

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    console.log('User message:', userMessage);

    // Display user message
    chatOutput.innerHTML += `<p><strong>You:</strong> ${userMessage}</p>`;
    userInput.value = '';

    // Display loading message
    const loadingElement = document.createElement('p');
    loadingElement.innerHTML = '<strong>Assistant:</strong> <span id="assistant-response"></span>';
    chatOutput.appendChild(loadingElement);

    const assistantResponse = document.getElementById('assistant-response');

    try {
        console.log('Sending chat request');
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: userMessage }),
        });

        console.log('Received response:', response);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            console.log('Received chunk:', chunk);
            const lines = chunk.split('\n\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        console.log('Received [DONE] signal');
                        break;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        console.log('Parsed data:', parsed);
                        assistantResponse.textContent += parsed.content;
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
        assistantResponse.textContent = `Error: ${error.message}`;
    }

    // Scroll to the bottom of the chat output
    chatOutput.scrollTop = chatOutput.scrollHeight;
});

// Add this at the end of the file
const clearChatButton = document.getElementById('clear-chat');
clearChatButton.addEventListener('click', () => {
    chatOutput.innerHTML = '';
});

let accessToken = null;

document.getElementById('login-button').addEventListener('click', () => {
    window.location.href = '/login';
});

window.onload = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    
    if (accessToken) {
        document.getElementById('login-button').style.display = 'none';
        document.getElementById('playlist-creator').style.display = 'block';
    }
};

document.getElementById('create-playlist-button').addEventListener('click', async () => {
    const prompt = document.getElementById('playlist-prompt').value;
    const chatOutput = document.getElementById('chat-output');

    try {
        // First, get playlist suggestions from OpenAI
        const openaiResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Create a playlist based on this description: ${prompt}. Provide a name, description, and list of 10 song titles with artists.` })
        });

        if (!openaiResponse.ok) throw new Error('Failed to get playlist suggestions');
        
        const openaiData = await openaiResponse.json();
        chatOutput.innerHTML = `<p><strong>AI Suggestion:</strong> ${openaiData.message}</p>`;

        // Here you would parse the AI's response to extract playlist name, description, and tracks
        // For this example, we'll use placeholder data
        const playlistName = "AI Generated Playlist";
        const playlistDescription = "Created based on user prompt";
        const tracks = ["spotify:track:1234567890"]; // You'd need to search for these tracks using Spotify API

        // Create the playlist on Spotify
        const createPlaylistResponse = await fetch('/api/create-playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: playlistName,
                description: playlistDescription,
                tracks: tracks,
                accessToken: accessToken
            })
        });

        if (!createPlaylistResponse.ok) throw new Error('Failed to create playlist');
        
        const playlistData = await createPlaylistResponse.json();
        chatOutput.innerHTML += `<p>Playlist created! ID: ${playlistData.playlistId}</p>`;
    } catch (error) {
        console.error('Error:', error);
        chatOutput.innerHTML += `<p>Error: ${error.message}</p>`;
    }
});
