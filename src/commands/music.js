import { spotifyService } from '../services/spotifyService.js';
import { youtubeService } from '../services/youtubeService.js';
import { musicPlayer } from '../services/musicPlayer.js';
import { Logger } from '../utils/logger.js';

export const musicCommands = {
  async play(message, args) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('You need to be in a voice channel to use this command!');
    }

    const input = args.join(' ');
    if (!input) {
      return message.reply('Please provide a YouTube/Spotify URL or search query!');
    }

    try {
      const processingMessage = await message.reply('🔍 Processing your request...');

      // Join voice channel
      await musicPlayer.joinChannel(voiceChannel);

      // Handle Spotify playlist
      if (spotifyService.isSpotifyUrl(input)) {
        const playlistId = spotifyService.extractPlaylistId(input);
        if (!playlistId) {
          return processingMessage.edit('❌ Invalid Spotify playlist URL!');
        }

        const playlist = await spotifyService.getPlaylistTracks(playlistId);
        const addedCount = await musicPlayer.addPlaylistToQueue(message.guild.id, playlist, message.author);
        
        return processingMessage.edit(`✅ Added ${addedCount} songs from **${playlist.name}** to the queue! Songs will be fetched as they play.`);
      }

      // Handle YouTube playlist
      if (youtubeService.isYouTubePlaylistUrl(input)) {
        const playlistId = youtubeService.extractPlaylistId(input);
        if (!playlistId) {
          return processingMessage.edit('❌ Invalid YouTube playlist URL!');
        }

        const playlist = await youtubeService.getPlaylistVideos(playlistId);
        const addedCount = await musicPlayer.addPlaylistToQueue(message.guild.id, playlist, message.author);
        
        return processingMessage.edit(`✅ Added ${addedCount} videos from **${playlist.name}** to the queue!`);
      }

      // Handle single YouTube video
      if (youtubeService.isYouTubeVideoUrl(input)) {
        const cleanUrl = youtubeService.cleanUrl(input);
        const videoInfo = await youtubeService.getVideoInfo(cleanUrl);
        await musicPlayer.addToQueue(message.guild.id, videoInfo, message.author);
        return processingMessage.edit(`✅ Added **${videoInfo.title}** to the queue!`);
      }

      // Handle search query
      const searchResults = await youtubeService.searchVideos(input, 1);
      if (searchResults.length === 0) {
        return processingMessage.edit('❌ No videos found for your search query!');
      }

      const video = searchResults[0];
      await musicPlayer.addToQueue(message.guild.id, video, message.author);
      return processingMessage.edit(`✅ Added **${video.title}** to the queue!`);

    } catch (error) {
      Logger.error('Play command error:', error.message);
      return message.reply(`❌ ${error.message}`);
    }
  },

  async search(message, args) {
    const query = args.join(' ');
    if (!query) {
      return message.reply('Please provide a search query!');
    }

    try {
      const searchResults = await youtubeService.searchVideos(query, 5);
      
      if (searchResults.length === 0) {
        return message.reply('❌ No videos found for your search query!');
      }

      const embed = {
        title: `🔍 Search Results for: ${query}`,
        description: searchResults.map((video, index) => {
          return `**${index + 1}.** [${video.title}](${video.url})\n*by ${video.author}*`;
        }).join('\n\n'),
        color: 0x00ff00,
        footer: {
          text: `Use !play [URL] to add a video to the queue`
        }
      };

      return message.reply({ embeds: [embed] });
    } catch (error) {
      Logger.error('Search command error:', error.message);
      return message.reply(`❌ ${error.message}`);
    }
  },

  async skip(message) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('You need to be in a voice channel to use this command!');
    }

    const skipped = musicPlayer.skip(message.guild.id);
    if (skipped) {
      return message.reply('⏭️ Skipped to the next song!');
    } else {
      return message.reply('❌ No songs to skip!');
    }
  },

  async pause(message) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('You need to be in a voice channel to use this command!');
    }

    musicPlayer.pause(message.guild.id);
    return message.reply('⏸️ Paused the music!');
  },

  async resume(message) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('You need to be in a voice channel to use this command!');
    }

    musicPlayer.resume(message.guild.id);
    return message.reply('▶️ Resumed the music!');
  },

  async stop(message) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('You need to be in a voice channel to use this command!');
    }

    musicPlayer.stop(message.guild.id);
    return message.reply('⏹️ Stopped the music and cleared the queue!');
  },

  async queue(message) {
    const queue = musicPlayer.getCurrentQueue(message.guild.id);
    const currentTrack = musicPlayer.getCurrentTrack(message.guild.id);
    
    if (queue.length === 0) {
      return message.reply('📭 The queue is empty!');
    }

    let queueText = '';
    
    // Show currently playing song
    if (currentTrack) {
      queueText += `**🎵 Now Playing:**\n${currentTrack.title} ${currentTrack.author ? `by ${currentTrack.author}` : ''} (requested by ${currentTrack.requestedBy.username})\n\n`;
    }
    
    // Show upcoming songs
    const upcomingSongs = currentTrack ? queue.slice(1, 11) : queue.slice(0, 10);
    if (upcomingSongs.length > 0) {
      queueText += '**📋 Up Next:**\n';
      queueText += upcomingSongs.map((track, index) => {
        const position = currentTrack ? index + 2 : index + 1;
        return `${position}. **${track.title}** ${track.author ? `by ${track.author}` : ''} (requested by ${track.requestedBy.username})`;
      }).join('\n');
    }

    const embed = {
      title: '🎵 Music Queue',
      description: queueText,
      color: 0x00ff00,
      footer: {
        text: queue.length > 10 ? `... and ${queue.length - 10} more songs` : `${queue.length} song(s) in queue`
      }
    };

    return message.reply({ embeds: [embed] });
  },

  async leave(message) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('You need to be in a voice channel to use this command!');
    }

    const left = musicPlayer.leave(message.guild.id);
    if (left) {
      return message.reply('👋 Left the voice channel!');
    } else {
      return message.reply('❌ I\'m not in a voice channel!');
    }
  },

  async nowplaying(message) {
    const currentTrack = musicPlayer.getCurrentTrack(message.guild.id);
    
    if (!currentTrack) {
      return message.reply('❌ Nothing is currently playing!');
    }

    const embed = {
      title: '🎵 Now Playing',
      description: `**${currentTrack.title}**\n${currentTrack.author ? `by ${currentTrack.author}` : ''}\nRequested by ${currentTrack.requestedBy.username}`,
      color: 0x00ff00,
      thumbnail: {
        url: currentTrack.thumbnail || null
      }
    };

    return message.reply({ embeds: [embed] });
  }
};