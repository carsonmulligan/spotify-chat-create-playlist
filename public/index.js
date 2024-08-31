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
