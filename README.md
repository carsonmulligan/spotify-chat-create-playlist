# 🎧 TuneSmith AI: Natural Language Spotify Playlist Creator

Welcome to the **AI-Powered Spotify Playlist Creator**! This app lets you create customized Spotify playlists by chatting with OpenAI's GPT-4o mini. 🎶

## 🎵 Quick Start: Try These Prompts!

Click on one of these examples to get started:

1. [Create an upbeat 80s workout mix](#)
2. [Generate a relaxing acoustic playlist for studying](#)
3. [Make a road trip playlist with classic rock hits](#)

Or type your own custom playlist description below!

## 🚀 Features

- **Natural Language Input**: Describe the playlist you want, and the AI handles the rest.
- **Spotify Integration**: Playlists are created directly in your Spotify account.
- **Smart Music Recommendations**: Discover new tracks that fit your mood and taste.

## 🛠️ How to 

1. **Login with Spotify**: Click the login button to authenticate with your Spotify account.
2. **Describe Your Playlist**: Enter a description of the playlist you want or click one of the example prompts above.
3. **Create & Enjoy**: The AI will generate a playlist and save it directly to your Spotify account. Enjoy the tunes!

## 📋 Requirements

- Node.js
- A Spotify account
- An OpenAI API key

## ⚙️ Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/carsonmulligan/spotify-chat-create-playlist.git

```

## Deployment on Render

1. Fork this repository to your GitHub account.
2. Create a new Web Service on Render.
3. Connect your GitHub repository to Render.
4. Configure the following environment variables in Render:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REDIRECT_URI` (set this to your Render app URL + '/callback', e.g., https://your-app-name.onrender.com/callback)
   - `OPENAI_API_KEY`
5. Deploy the application.

## Local Development

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Create a `.env` file with the required environment variables.
4. Run `npm run dev` to start the development server.

## Environment Variables

- `SPOTIFY_CLIENT_ID`: Your Spotify application client ID
- `SPOTIFY_CLIENT_SECRET`: Your Spotify application client secret
- `SPOTIFY_REDIRECT_URI`: The redirect URI for Spotify authentication
- `OPENAI_API_KEY`: Your OpenAI API key
