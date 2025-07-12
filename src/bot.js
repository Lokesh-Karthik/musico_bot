import { Client, GatewayIntentBits } from 'discord.js';
import { config, validateConfig } from './config.js';
import { musicCommands } from './commands/music.js';
import { registerSlashCommands } from './commands/slashCommands.js';
import { slashHandlers } from './commands/slashHandlers.js';
import { Logger } from './utils/logger.js';

class DiscordMusicBot {
  constructor() {
    validateConfig();
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.once('ready', async () => {
      Logger.info(`🤖 Bot is ready! Logged in as ${this.client.user.tag}`);
      Logger.info(`📊 Serving ${this.client.guilds.cache.size} guilds`);
      
      // Register slash commands
      await registerSlashCommands();
      
      this.client.user.setActivity('🎵 Music | !help for commands', { 
        type: 'LISTENING'
      });
    });

    this.client.on('messageCreate', async (message) => {
      if (message.author.bot || !message.content.startsWith(config.bot.prefix)) {
        return;
      }

      const args = message.content.slice(config.bot.prefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();

      try {
        switch (command) {
          case 'play':
          case 'p':
            await musicCommands.play(message, args);
            break;
          case 'skip':
          case 's':
            await musicCommands.skip(message);
            break;
          case 'pause':
            await musicCommands.pause(message);
            break;
          case 'resume':
          case 'r':
            await musicCommands.resume(message);
            break;
          case 'stop':
            await musicCommands.stop(message);
            break;
          case 'queue':
          case 'q':
            await musicCommands.queue(message);
            break;
          case 'leave':
          case 'disconnect':
            await musicCommands.leave(message);
            break;
          case 'search':
            await musicCommands.search(message, args);
            break;
          case 'nowplaying':
          case 'np':
            await musicCommands.nowplaying(message);
            break;
          case 'help':
            await this.showHelp(message);
            break;
          default:
            break;
        }
      } catch (error) {
        Logger.error('Command execution error:', error.message);
        message.reply('❌ An error occurred while executing the command!');
      }
    });

    // Handle slash commands
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const { commandName } = interaction;

      try {
        if (slashHandlers[commandName]) {
          await slashHandlers[commandName](interaction);
        }
      } catch (error) {
        Logger.error('Slash command execution error:', error.message);
        
        const errorMessage = '❌ An error occurred while executing the command!';
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    });

    this.client.on('error', (error) => {
      Logger.error('Discord client error:', error.message);
    });

    this.client.on('disconnect', () => {
      Logger.warn('Bot disconnected from Discord');
    });

    this.client.on('reconnecting', () => {
      Logger.info('Bot reconnecting to Discord...');
    });
  }

  async showHelp(message) {
    const embed = {
      title: '🎵 Music Bot Commands',
      description: 'Here are all the available commands:',
      fields: [
        {
          name: '🎵 Music Commands',
          value: [
            `\`${config.bot.prefix}play [URL/search]\` - Play music from YouTube/Spotify`,
            `\`${config.bot.prefix}skip\` - Skip current song`,
            `\`${config.bot.prefix}pause\` - Pause current song`,
            `\`${config.bot.prefix}resume\` - Resume current song`,
            `\`${config.bot.prefix}stop\` - Stop music and clear queue`,
            `\`${config.bot.prefix}queue\` - Show current queue`,
            `\`${config.bot.prefix}leave\` - Leave voice channel`,
            `\`${config.bot.prefix}search [query]\` - Search for videos`,
            `\`${config.bot.prefix}nowplaying\` - Show currently playing song`,
          ].join('\n'),
          inline: false
        },
        {
          name: '📝 Usage Examples',
          value: [
            `\`${config.bot.prefix}play https://open.spotify.com/playlist/...\``,
            `\`${config.bot.prefix}play https://www.youtube.com/watch?v=...\``,
            `\`${config.bot.prefix}play https://www.youtube.com/playlist?list=...\``,
            'You can also use `/` slash commands (just type `/` and see the options):',
            '`/play`, `/skip`, `/queue`, `/help`, etc.'
          ].join('\n'),
          inline: false
        }
      ],
      color: 0x00ff00,
      footer: {
        text: 'Supports YouTube/Spotify playlists and search!'
      }
    };

    return message.reply({ embeds: [embed] });
  }

  async start() {
    try {
      await this.client.login(config.discord.token);
      Logger.info('🚀 Discord Music Bot started successfully');
    } catch (error) {
      Logger.error('Failed to start bot:', error.message);
      process.exit(1);
    }
  }

  async stop() {
    Logger.info('🛑 Shutting down Discord Music Bot...');
    await this.client.destroy();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  Logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  Logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

export { DiscordMusicBot };