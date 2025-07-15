import ffmpeg from 'ffmpeg-static';
import { DiscordMusicBot } from './src/bot.js';
import { Logger } from './src/utils/logger.js';
import { keep_alive } from './keep_alive.js';

async function main() {
  try {
    // Set FFmpeg path for @discordjs/voice
    process.env.FFMPEG_PATH = ffmpeg;
    
    Logger.info('🚀 Starting Discord Music Bot...');
    
    const bot = new DiscordMusicBot();
    await bot.start();
  } catch (error) {
    Logger.error('Failed to start application:', error.message);
    process.exit(1);
  }
}

main();