import { musicCommands } from './music.js';
import { Logger } from '../utils/logger.js';
import { config } from '../config.js';

export const slashHandlers = {
  async play(interaction) {
    const query = interaction.options.getString('query');
    
    // Create a mock message object for compatibility with existing music commands
    const mockMessage = {
      member: interaction.member,
      guild: interaction.guild,
      author: interaction.user,
      reply: async (content) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(content);
        }
        return interaction.reply(content);
      }
    };

    await interaction.deferReply();
    await musicCommands.play(mockMessage, [query]);
  },

  async search(interaction) {
    const query = interaction.options.getString('query');
    
    const mockMessage = {
      member: interaction.member,
      guild: interaction.guild,
      author: interaction.user,
      reply: async (content) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(content);
        }
        return interaction.reply(content);
      }
    };

    await interaction.deferReply();
    await musicCommands.search(mockMessage, [query]);
  },

  async skip(interaction) {
    const mockMessage = {
      member: interaction.member,
      guild: interaction.guild,
      author: interaction.user,
      reply: async (content) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(content);
        }
        return interaction.reply(content);
      }
    };

    await musicCommands.skip(mockMessage);
  },

  async pause(interaction) {
    const mockMessage = {
      member: interaction.member,
      guild: interaction.guild,
      author: interaction.user,
      reply: async (content) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(content);
        }
        return interaction.reply(content);
      }
    };

    await musicCommands.pause(mockMessage);
  },

  async resume(interaction) {
    const mockMessage = {
      member: interaction.member,
      guild: interaction.guild,
      author: interaction.user,
      reply: async (content) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(content);
        }
        return interaction.reply(content);
      }
    };

    await musicCommands.resume(mockMessage);
  },

  async stop(interaction) {
    const mockMessage = {
      member: interaction.member,
      guild: interaction.guild,
      author: interaction.user,
      reply: async (content) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(content);
        }
        return interaction.reply(content);
      }
    };

    await musicCommands.stop(mockMessage);
  },

  async queue(interaction) {
    const mockMessage = {
      member: interaction.member,
      guild: interaction.guild,
      author: interaction.user,
      reply: async (content) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(content);
        }
        return interaction.reply(content);
      }
    };

    await musicCommands.queue(mockMessage);
  },

  async nowplaying(interaction) {
    const mockMessage = {
      member: interaction.member,
      guild: interaction.guild,
      author: interaction.user,
      reply: async (content) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(content);
        }
        return interaction.reply(content);
      }
    };

    await musicCommands.nowplaying(mockMessage);
  },

  async leave(interaction) {
    const mockMessage = {
      member: interaction.member,
      guild: interaction.guild,
      author: interaction.user,
      reply: async (content) => {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp(content);
        }
        return interaction.reply(content);
      }
    };

    await musicCommands.leave(mockMessage);
  },

  async help(interaction) {
    const embed = {
      title: '🎵 Music Bot Commands',
      description: 'Here are all the available commands (you can use both `/` slash commands and `!` prefix commands):',
      fields: [
        {
          name: '🎵 Music Commands',
          value: [
            '`/play [URL/search]` - Play music from YouTube/Spotify',
            '`/skip` - Skip current song',
            '`/pause` - Pause current song',
            '`/resume` - Resume current song',
            '`/stop` - Stop music and clear queue',
            '`/queue` - Show current queue',
            '`/leave` - Leave voice channel',
            '`/search [query]` - Search for videos',
            '`/nowplaying` - Show currently playing song',
            '`/help` - Show this help message',
          ].join('\n'),
          inline: false
        },
        {
          name: '📝 Usage Examples',
          value: [
            '`/play https://open.spotify.com/playlist/...`',
            '`/play https://www.youtube.com/watch?v=...`',
            '`/play https://www.youtube.com/playlist?list=...`',
            '`/play never gonna give you up`',
            '`/search rick astley`',
          ].join('\n'),
          inline: false
        },
        {
          name: '💡 Alternative Prefix Commands',
          value: [
            `You can also use \`${config.bot.prefix}\` prefix commands:`,
            `\`${config.bot.prefix}play\`, \`${config.bot.prefix}skip\`, \`${config.bot.prefix}queue\`, etc.`
          ].join('\n'),
          inline: false
        }
      ],
      color: 0x00ff00,
      footer: {
        text: 'Supports YouTube/Spotify playlists and search!'
      }
    };

    return interaction.reply({ embeds: [embed] });
  }
};