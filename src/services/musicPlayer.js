import { 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus,
  joinVoiceChannel,
  StreamType
} from '@discordjs/voice';
import { youtubeService } from './youtubeService.js';
import { Logger } from '../utils/logger.js';

export class MusicPlayer {
  constructor() {
    this.queues = new Map();
    this.players = new Map();
    this.connections = new Map();
    this.currentlyPlaying = new Map();
    this.isPlaying = new Map();
  }

  getQueue(guildId) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, []);
    }
    return this.queues.get(guildId);
  }

  getPlayer(guildId) {
    if (!this.players.has(guildId)) {
      const player = createAudioPlayer();
      this.players.set(guildId, player);
      
      player.on(AudioPlayerStatus.Idle, () => {
        Logger.info(`Player idle in guild ${guildId}, playing next song`);
        this.isPlaying.set(guildId, false);
        this.playNext(guildId);
      });

      player.on(AudioPlayerStatus.Playing, () => {
        Logger.info(`Player started playing in guild ${guildId}`);
        this.isPlaying.set(guildId, true);
      });

      player.on('error', (error) => {
        Logger.error(`Audio player error in guild ${guildId}:`, error.message);
        this.isPlaying.set(guildId, false);
        this.playNext(guildId);
      });
    }
    return this.players.get(guildId);
  }

  async joinChannel(voiceChannel) {
    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      this.connections.set(voiceChannel.guild.id, connection);

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        Logger.info(`Disconnected from voice channel in guild ${voiceChannel.guild.id}`);
      });

      connection.on('error', (error) => {
        Logger.error(`Voice connection error in guild ${voiceChannel.guild.id}:`, error.message);
      });

      const player = this.getPlayer(voiceChannel.guild.id);
      connection.subscribe(player);

      return connection;
    } catch (error) {
      Logger.error('Failed to join voice channel:', error.message);
      throw error;
    }
  }

  async addToQueue(guildId, track, requestedBy) {
    const queue = this.getQueue(guildId);
    const queueItem = {
      ...track,
      requestedBy,
      addedAt: new Date()
    };
    
    queue.push(queueItem);
    Logger.info(`Added to queue: ${track.title} (Guild: ${guildId})`);
    
    // Only start playing if nothing is currently playing
    if (!this.isPlaying.get(guildId)) {
      await this.playNext(guildId);
    }
    
    return queueItem;
  }

  async addPlaylistToQueue(guildId, playlist, requestedBy) {
    const queue = this.getQueue(guildId);
    
    // Add all tracks to queue without fetching streams
    for (const track of playlist.tracks || playlist.videos) {
      const queueItem = {
        ...track,
        requestedBy,
        addedAt: new Date(),
        isPlaylist: true
      };
      queue.push(queueItem);
    }
    
    Logger.info(`Added ${playlist.tracks?.length || playlist.videos?.length} songs from playlist to queue (Guild: ${guildId})`);
    
    // Only start playing if nothing is currently playing
    if (!this.isPlaying.get(guildId)) {
      await this.playNext(guildId);
    }
    
    return playlist.tracks?.length || playlist.videos?.length;
  }

  async playNext(guildId) {
    const queue = this.getQueue(guildId);
    const player = this.getPlayer(guildId);

    if (queue.length === 0) {
      Logger.info(`Queue empty for guild ${guildId}`);
      this.isPlaying.set(guildId, false);
      this.currentlyPlaying.delete(guildId);
      return;
    }

    const track = queue.shift();
    this.currentlyPlaying.set(guildId, track);
    
    try {
      Logger.info(`Preparing to play: ${track.title} (Guild: ${guildId})`);
      
      let audioUrl = track.url;
      
      // If it's a Spotify track or search query, search for it on YouTube
      if (track.searchQuery && !track.url) {
        Logger.info(`Searching YouTube for: ${track.searchQuery}`);
        const searchResults = await youtubeService.searchVideos(track.searchQuery, 1);
        
        if (searchResults.length === 0) {
          Logger.error(`No YouTube results found for: ${track.searchQuery}`);
          return this.playNext(guildId);
        }
        
        audioUrl = searchResults[0].url;
        track.url = audioUrl;
        Logger.info(`Found YouTube URL: ${audioUrl}`);
      }
      
      if (!audioUrl) {
        Logger.error(`No URL available for track: ${track.title}`);
        return this.playNext(guildId);
      }
      
      // Get audio stream only when we're about to play
      Logger.info(`Creating audio stream for: ${audioUrl}`);
      const stream = await youtubeService.getAudioStream(audioUrl);
      
      const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
        metadata: {
          title: track.title,
          url: audioUrl
        }
      });
      
      player.play(resource);
      
      Logger.info(`Now playing: ${track.title} (Guild: ${guildId})`);
    } catch (error) {
      Logger.error(`Failed to play track: ${track.title}`, error.message);
      Logger.info('Attempting to play next track...');
      this.isPlaying.set(guildId, false);
      return this.playNext(guildId);
    }
  }

  skip(guildId) {
    const player = this.getPlayer(guildId);
    const queue = this.getQueue(guildId);
    
    if (this.isPlaying.get(guildId) || queue.length > 0) {
      player.stop(); // This will trigger the 'idle' event and play next song
      return true;
    }
    return false;
  }

  pause(guildId) {
    const player = this.getPlayer(guildId);
    return player.pause();
  }

  resume(guildId) {
    const player = this.getPlayer(guildId);
    return player.unpause();
  }

  stop(guildId) {
    const player = this.getPlayer(guildId);
    const queue = this.getQueue(guildId);
    
    queue.length = 0;
    this.isPlaying.set(guildId, false);
    this.currentlyPlaying.delete(guildId);
    player.stop();
    
    const connection = this.connections.get(guildId);
    if (connection) {
      connection.destroy();
      this.connections.delete(guildId);
    }
  }

  getCurrentQueue(guildId) {
    const queue = this.getQueue(guildId);
    const currentTrack = this.currentlyPlaying.get(guildId);
    
    if (currentTrack) {
      return [currentTrack, ...queue];
    }
    return queue;
  }

  getCurrentTrack(guildId) {
    return this.currentlyPlaying.get(guildId);
  }

  leave(guildId) {
    const connection = this.connections.get(guildId);
    if (connection) {
      this.stop(guildId);
      return true;
    }
    return false;
  }
}

export const musicPlayer = new MusicPlayer();