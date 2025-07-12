import dotenv from 'dotenv';

dotenv.config();

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  },
  bot: {
    prefix: process.env.PREFIX || '!',
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
  },
};

export function validateConfig() {
  const required = [
    'DISCORD_TOKEN',
    'CLIENT_ID',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Please copy .env.example to .env and fill in the required values');
    process.exit(1);
  }

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.warn('Spotify credentials not provided. Spotify playlist support will be disabled.');
  }

  if (!process.env.YOUTUBE_API_KEY) {
    console.warn('YouTube API key not provided. Search and playlist features will be limited.');
  }
}