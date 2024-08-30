const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
    });
}

const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatOutput = document.getElementById('chat-output');

const apiKeyForm = document.getElementById('api-key-form');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeyStatus = document.getElementById('api-key-status');
let apiKey = '';

apiKeyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        apiKeyStatus.textContent = 'API Key set successfully!';
        apiKeyInput.value = ''; // Clear the input for security
    } else {
        apiKeyStatus.textContent = 'Please enter a valid API Key.';
    }
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    // Display user message
    chatOutput.innerHTML += `<p><strong>You:</strong> ${userMessage}</p>`;
    userInput.value = '';

    // Display loading message
    const loadingElement = document.createElement('p');
    loadingElement.innerHTML = '<strong>Assistant:</strong> Thinking...';
    chatOutput.appendChild(loadingElement);

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
            const errorData = await response.json();
            throw new Error(`API request failed: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        console.log('Parsed response data:', data);
        
        // Remove loading message
        loadingElement.remove();
        
        // Display assistant's response
        chatOutput.innerHTML += `<p><strong>Assistant:</strong> ${data.message}</p>`;
    } catch (error) {
        console.error('Error:', error);
        // Remove loading message
        loadingElement.remove();
        chatOutput.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
    }

    // Scroll to the bottom of the chat output
    chatOutput.scrollTop = chatOutput.scrollHeight;
});

// Fetch git info
fetch('/api/git-info')
  .then(response => response.json())
  .then(data => {
    document.getElementById('version').textContent = data.commitId;
    document.getElementById('updated').textContent = data.lastCommitDate;
  })
  .catch(error => {
    console.error('Error fetching git info:', error);
    document.getElementById('version').textContent = 'Unknown';
    document.getElementById('updated').textContent = 'Unknown';
  });

// Add this at the end of the file
const clearChatButton = document.getElementById('clear-chat');
clearChatButton.addEventListener('click', () => {
    chatOutput.innerHTML = '';
});
