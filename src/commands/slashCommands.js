import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { config } from '../config.js';
import { Logger } from '../utils/logger.js';

export const slashCommands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play music from YouTube/Spotify URL or search query')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('YouTube/Spotify URL or search query')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for videos on YouTube')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Search query')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),

  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),

  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the current song'),

  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music and clear the queue'),

  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),

  new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song'),

  new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave the voice channel'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands')
];

export async function registerSlashCommands() {
  try {
    Logger.info('🔄 Registering slash commands...');
    
    const rest = new REST({ version: '9' }).setToken(config.discord.token);
    
    await rest.put(
      Routes.applicationCommands(config.discord.clientId),
      { body: slashCommands.map(command => command.toJSON()) }
    );
    
    Logger.info('✅ Successfully registered slash commands globally');
  } catch (error) {
    Logger.error('Failed to register slash commands:', error.message);
  }
}