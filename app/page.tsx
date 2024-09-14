import React from 'react';

export default function Home() {
  return (
    <div className="container">
      <h1>AI Spotify Playlist Creator</h1>
      <button id="login-button">Login with Spotify</button>
      <div id="playlist-creator" style={{display: 'none'}}>
        <h2>Create a Playlist</h2>
        <p>Instructions: Tell the AI what type of playlist you want</p>
        <div id="prompt-examples">
          <h3>Quick Start: Try These Prompts!</h3>
          <ul>
            <li><a href="#" className="prompt-example">Seven songs by Jeanne Moreau, seven songs by artists like her</a></li>
            <li><a href="#" className="prompt-example">Hong Kong Pop Classics in 1998</a></li>
            <li><a href="#" className="prompt-example">Country Songs about Oklahoma</a></li>
          </ul>
        </div>
        <textarea id="playlist-prompt" rows={4} placeholder="Describe your playlist..."></textarea>
        <button id="create-playlist-button">Create Playlist</button>
        <p id="playlist-count-message"></p>
        <button id="upgrade-button" style={{display: 'none'}}>Upgrade to Pro</button>
      </div>
      <div id="result"></div>
    </div>
  )
}