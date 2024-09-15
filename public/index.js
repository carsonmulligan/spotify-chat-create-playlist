// public/index.js
let accessToken = null;

const loginButton = document.getElementById('login-button');
const playlistCreator = document.getElementById('playlist-creator');
const createPlaylistButton = document.getElementById('create-playlist-button');
const playlistPrompt = document.getElementById('playlist-prompt');
const result = document.getElementById('result');
const promptExamples = document.querySelectorAll('.prompt-example');

loginButton.addEventListener('click', () => {
  window.location.href = '/login';
});

window.onload = () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  accessToken = params.get('access_token');

  if (accessToken) {
    loginButton.style.display = 'none';
    playlistCreator.style.display = 'block';
    result.innerHTML = '<p>Successfully logged in to Spotify!</p>';

    // Fetch the user profile
    fetch('/api/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
      .then(response => response.json())
      .then(data => {
        console.log('User profile:', data);
        result.innerHTML += `<p>Welcome, ${data.display_name}!</p>`;
      })
      .catch(error => {
        console.error('Error fetching user profile:', error);
        result.innerHTML += `<p>Error fetching user profile: ${error.message}</p>`;
      });
  } else if (params.get('error')) {
    result.innerHTML = `<p>Error: ${params.get('error')}</p>`;
  }

  window.location.hash = '';
};

promptExamples.forEach(example => {
  example.addEventListener('click', (e) => {
    e.preventDefault();
    playlistPrompt.value = e.target.textContent;
  });
});

let stripe;

document.addEventListener('DOMContentLoaded', () => {
  fetch('/config')
    .then((response) => response.json())
    .then((data) => {
      stripe = Stripe(data.publishableKey);
    })
    .catch(error => {
      console.error('Error loading Stripe:', error);
    });
});

createPlaylistButton.addEventListener('click', async () => {
  const prompt = playlistPrompt.value;

  try {
    result.innerHTML = '<p>Creating playlist...</p>';

    const response = await fetch('/api/create-playlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        prompt: prompt
      })
    });

    if (response.status === 403) {
      // Playlist limit reached, prompt for subscription
      result.innerHTML = '<p>You have reached your free playlist limit. Please subscribe to create more playlists.</p>';

      // Create a checkout session
      const sessionResponse = await fetch('/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({})
      });

      const session = await sessionResponse.json();

      // Redirect to Stripe Checkout
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: session.id,
        });
        if (error) {
          console.error('Error redirecting to checkout:', error);
        }
      } else {
        console.error('Stripe is not initialized');
      }
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
