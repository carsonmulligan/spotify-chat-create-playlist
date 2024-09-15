let stripe;

fetch('/config')
    .then((response) => response.json())
    .then((data) => {
        stripe = Stripe(data.publishableKey);
    });

const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');
const subscriptionInfo = document.getElementById('subscription-info');

// Check if the user is authenticated
fetch('/check-auth')
    .then(response => response.json())
    .then(data => {
        if (!data.authenticated) {
            window.location.href = '/login';
        }
    });

createPlaylistButton.addEventListener('click', async () => {
    const prompt = playlistPrompt.value;
    
    try {
        result.innerHTML = '<p>Creating playlist...</p>';
        
        const response = await fetch('/api/create-playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        if (response.status === 403) {
            const data = await response.json();
            result.innerHTML = `<p>${data.error}</p>`;
            subscriptionInfo.innerHTML = `
                <p>Subscribe to create unlimited playlists!</p>
                <button id="subscribe-button">Subscribe Now</button>
            `;
            document.getElementById('subscribe-button').addEventListener('click', startSubscription);
            return;
        }

        if (!response.ok) throw new Error('Failed to create playlist');
        
        const data = await response.json();
        result.innerHTML = `<p>Playlist created successfully! You can view it <a href="${data.playlistUrl}" target="_blank">here</a>.</p>`;
    } catch (error) {
        console.error('Error:', error);
        result.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});

async function startSubscription() {
    try {
        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }

        const session = await response.json();
        const result = await stripe.redirectToCheckout({
            sessionId: session.id,
        });

        if (result.error) {
            throw result.error;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to start subscription process. Please try again.');
    }
}