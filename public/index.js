let accessToken = null;
let refreshToken = null;

const loginButton = document.getElementById('login-button');
const playlistCreator = document.getElementById('playlist-creator');
const chatInterface = document.getElementById('chat-interface');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatOutput = document.getElementById('chat-output');
const clearChatButton = document.getElementById('clear-chat');
const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');

loginButton.addEventListener('click', () => {
    window.location.href = '/login';
});

window.onload = () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    accessToken = params.get('access_token');
    refreshToken = params.get('refresh_token');
    
    if (accessToken) {
        loginButton.style.display = 'none';
        playlistCreator.style.display = 'block';
        chatInterface.style.display = 'block';
        chatOutput.innerHTML = '<p>Successfully logged in to Spotify!</p>';
    } else if (params.get('error')) {
        chatOutput.innerHTML = `<p>Error: ${params.get('error')}</p>`;
    }

    // Clear the hash to remove tokens from the URL
    window.location.hash = '';
};

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
                    try {
                        const parsed = JSON.parse(data);
                        console.log('Parsed data:', parsed);
                        if (parsed.content === '[DONE]') {
                            console.log('Received [DONE] signal');
                            break;
                        }
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

clearChatButton.addEventListener('click', () => {
    chatOutput.innerHTML = '';
});

createPlaylistButton.addEventListener('click', async () => {
    const prompt = playlistPrompt.value;
    
    try {
        // Get playlist suggestions from OpenAI
        const openaiResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `Create a playlist based on this description: ${prompt}. Provide a name, description, and list of 10 song titles with artists.` })
        });

        if (!openaiResponse.ok) throw new Error('Failed to get playlist suggestions');
        
        const reader = openaiResponse.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(data);
                        aiResponse += parsed.content;
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                    }
                }
            }
        }

        // Parse the AI response
        const playlistName = aiResponse.match(/\*\*Playlist Name:\*\* "(.*?)"/)[1];
        const playlistDescription = aiResponse.match(/\*\*Description:\*\* (.*?)\n\n/s)[1];
        const tracks = aiResponse.match(/\d+\. "(.*?)" - (.*?)(?:\n|$)/g).map(track => {
            const [, title, artist] = track.match(/"(.*?)" - (.*?)$/);
            return { title, artist };
        });

        chatOutput.innerHTML = `<p><strong>AI Suggestion:</strong><br>
            Name: ${playlistName}<br>
            Description: ${playlistDescription}<br>
            Tracks: ${tracks.map(t => `${t.title} by ${t.artist}`).join(', ')}
        </p>`;

        // Create the playlist on Spotify
        const createPlaylistResponse = await fetch('/api/create-playlist', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                name: playlistName,
                description: playlistDescription,
                tracks: tracks
            })
        });

        if (!createPlaylistResponse.ok) throw new Error('Failed to create playlist');
        
        const playlistData = await createPlaylistResponse.json();
        chatOutput.innerHTML += `<p>Playlist created successfully! You can view it <a href="${playlistData.playlistUrl}" target="_blank">here</a>.</p>`;
    } catch (error) {
        console.error('Error:', error);
        chatOutput.innerHTML += `<p>Error: ${error.message}</p>`;
    }
});
