# Discord Music Bot

A feature-rich Discord music bot that can play songs from YouTube Music and Spotify playlists. Simply paste a playlist link and the bot will play all songs from that playlist!

## Features

- 🎵 Play music from YouTube and YouTube Music
- 📱 Support for Spotify playlist links
- 🎼 Queue management with multiple songs
- ⏭️ Music controls (play, pause, skip, stop)
- 🔍 Search functionality for songs
- 📋 View current queue
- 🤖 Easy-to-use commands

## Setup

### 1. Prerequisites

- Node.js 18 or higher
- A Discord application and bot token
- (Optional) Spotify Client ID and Secret for Spotify playlist support

### 2. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token
5. Enable the following bot permissions:
   - Send Messages
   - Connect
   - Speak
   - Use Voice Activity

### 3. Spotify API Setup (Optional)

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Copy the Client ID and Client Secret

### 4. Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. Fill in your configuration in `.env`:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_application_id_here
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   PREFIX=!
   ```

### 5. Invite Bot to Server

Use this URL format to invite your bot (replace CLIENT_ID):
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=3148800&scope=bot
```

### 6. Run the Bot

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!play [URL/search]` | Play music from URL or search | `!play https://open.spotify.com/playlist/...` |
| `!skip` | Skip current song | `!skip` |
| `!pause` | Pause current song | `!pause` |
| `!resume` | Resume current song | `!resume` |
| `!stop` | Stop music and clear queue | `!stop` |
| `!queue` | Show current queue | `!queue` |
| `!leave` | Leave voice channel | `!leave` |
| `!help` | Show help message | `!help` |

## Supported URLs

- ✅ Spotify playlists: `https://open.spotify.com/playlist/...`
- ✅ YouTube videos: `https://www.youtube.com/watch?v=...`
- ✅ YouTube Music: `https://music.youtube.com/watch?v=...`
- ✅ Search queries: `!play never gonna give you up`

## Notes

- YouTube playlist support requires YouTube Data API integration (not included in this basic version)
- The bot requires voice channel permissions to join and play music
- Spotify playlist support requires Spotify API credentials
- For production use, consider implementing additional error handling and rate limiting

## Troubleshooting

### Bot not responding
- Check if the bot has proper permissions in your Discord server
- Verify the bot token is correct in `.env`
- Make sure the bot is online and properly invited

### Audio not playing
- Ensure the bot has "Connect" and "Speak" permissions in voice channels
- Check if you're in a voice channel when using commands
- Verify your internet connection and try again

### Spotify playlists not working
- Make sure you've set up Spotify API credentials
- Check if the playlist URL is public and accessible
- Verify your Spotify Client ID and Secret are correct

## License

MIT License - feel free to modify and use for your own projects!