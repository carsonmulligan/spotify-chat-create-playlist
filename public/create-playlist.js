let stripe;

fetch('/config')
    .then((response) => response.json())
    .then((data) => {
        stripe = Stripe(data.publishableKey, {
            stripeAccount: data.stripeAccount,
            apiVersion: "2020-08-27"
        });
    })
    .catch((error) => {
        console.error('Error loading Stripe configuration:', error);
    });

const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');
const subscriptionInfo = document.getElementById('subscription-info');
const promptExamples = document.querySelectorAll('.prompt-example');

// Check if the user is authenticated
fetch('/check-auth')
  .then(response => response.json())
  .then(data => {
      if (!data.authenticated) {
          window.location.href = '/login';
      }
  });


promptExamples.forEach(example => {
    example.addEventListener('click', (e) => {
        e.preventDefault();
        playlistPrompt.value = e.target.textContent.split(': ')[1];
    });
});

createPlaylistButton.addEventListener('click', async () => {
    const prompt = playlistPrompt.value;
    const resultDiv = result;

    try {
        const response = await fetch('/api/create-playlist', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        resultDiv.innerHTML = `<p>Playlist created! <a href="${data.playlistUrl}" target="_blank">View on Spotify</a></p>`;
    } catch (error) {
        console.error('Error:', error);
        resultDiv.innerHTML = `<p>Error creating playlist: ${error.message}</p>`;
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