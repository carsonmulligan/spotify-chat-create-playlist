document.getElementById('searchBtn').addEventListener('click', async () => {
  const clientId = document.getElementById('clientId').value;
  const clientSecret = document.getElementById('clientSecret').value;
  const track = document.getElementById('track').value;
  const resultDiv = document.getElementById('result');

  // Clear previous result
  resultDiv.innerHTML = '';

  if (!clientId || !clientSecret || !track) {
    resultDiv.innerHTML = '<p>Please provide all inputs.</p>';
    return;
  }

  try {
    // Step 1: Get an access token from Spotify
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      resultDiv.innerHTML = '<p>Failed to obtain access token.</p>';
      return;
    }

    // Step 2: Search for the track using the access token
    const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(track)}&type=track&limit=1`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const searchData = await searchResponse.json();

    if (searchData.tracks.items.length > 0) {
      const trackInfo = searchData.tracks.items[0];
      resultDiv.innerHTML = `
        <p><strong>Track Name:</strong> ${trackInfo.name}</p>
        <p><strong>Artist:</strong> ${trackInfo.artists[0].name}</p>
        <p><strong>Album:</strong> ${trackInfo.album.name}</p>
        <p><a href="${trackInfo.external_urls.spotify}" target="_blank">Listen on Spotify</a></p>
      `;
    } else {
      resultDiv.innerHTML = '<p>No tracks found.</p>';
    }
  } catch (error) {
    console.error('Error:', error);
    resultDiv.innerHTML = '<p>An error occurred during the search.</p>';
  }
});
