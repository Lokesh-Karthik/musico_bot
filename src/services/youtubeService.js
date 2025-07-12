import ytdl from 'ytdl-core';
import { google } from 'googleapis';
import { config } from '../config.js';
import { Logger } from '../utils/logger.js';

class YouTubeService {
  constructor() {
    this.ytdlOptions = {
      quality: 'highestaudio',
      filter: 'audioonly',
      format: 'audioonly',
      highWaterMark: 1 << 25,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      }
    };

    // Initialize YouTube Data API
    if (config.youtube.apiKey) {
      this.youtube = google.youtube({
        version: 'v3',
        auth: config.youtube.apiKey
      });
      this.apiEnabled = true;
      Logger.info('YouTube Data API initialized successfully');
    } else {
      this.apiEnabled = false;
      Logger.warn('YouTube API key not provided. Search and playlist features will be limited.');
    }

    Logger.info('YouTube service initialized with ytdl-core latest and YouTube Data API');
  }

  isYouTubePlaylistUrl(url) {
    return url.includes('youtube.com/playlist') || url.includes('music.youtube.com/playlist');
  }

  isYouTubeVideoUrl(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/,
      /music\.youtube\.com\/watch\?v=/
    ];
    return patterns.some(pattern => pattern.test(url));
  }

  extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }

  extractPlaylistId(url) {
    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  async validateVideo(url) {
    try {
      const info = await ytdl.getInfo(url);
      return !!info;
    } catch (error) {
      return false;
    }
  }

  async searchVideos(query, maxResults = 5) {
    if (!this.apiEnabled) {
      Logger.warn('YouTube Data API not available for search');
      throw new Error('Search functionality requires YouTube Data API key');
    }

    try {
      Logger.info(`Searching YouTube for: ${query}`);
      
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        type: ['video'],
        maxResults: maxResults,
        order: 'relevance',
        videoEmbeddable: 'true',
        videoSyndicated: 'true'
      });

      const videos = response.data.items.map(item => ({
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnail: item.snippet.thumbnails?.default?.url,
        author: item.snippet.channelTitle,
        description: item.snippet.description
      }));

      Logger.info(`Found ${videos.length} search results`);
      return videos;
    } catch (error) {
      Logger.error('YouTube search failed:', error.message);
      
      if (error.message.includes('quotaExceeded')) {
        throw new Error('YouTube API quota exceeded. Please try again later.');
      }
      
      if (error.message.includes('keyInvalid')) {
        throw new Error('Invalid YouTube API key. Please check your configuration.');
      }
      
      throw new Error(`YouTube search failed: ${error.message}`);
    }
  }

  async getPlaylistVideos(playlistId) {
    if (!this.apiEnabled) {
      Logger.warn('YouTube Data API not available for playlists');
      throw new Error('Playlist functionality requires YouTube Data API key');
    }

    try {
      Logger.info(`Fetching YouTube playlist: ${playlistId}`);
      
      // Get playlist details
      const playlistResponse = await this.youtube.playlists.list({
        part: ['snippet'],
        id: [playlistId]
      });

      if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
        throw new Error('Playlist not found or is private');
      }

      const playlistInfo = playlistResponse.data.items[0];
      const videos = [];
      let nextPageToken = null;

      do {
        const response = await this.youtube.playlistItems.list({
          part: ['snippet'],
          playlistId: playlistId,
          maxResults: 50,
          pageToken: nextPageToken
        });

        const items = response.data.items.filter(item => 
          item.snippet.resourceId.kind === 'youtube#video'
        );

        videos.push(...items.map(item => ({
          title: item.snippet.title,
          url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
          thumbnail: item.snippet.thumbnails?.default?.url,
          author: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
          description: item.snippet.description
        })));

        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      Logger.info(`Found ${videos.length} videos in playlist: ${playlistInfo.snippet.title}`);
      
      return {
        name: playlistInfo.snippet.title,
        videos: videos
      };
    } catch (error) {
      Logger.error('Failed to fetch YouTube playlist:', error.message);
      
      if (error.message.includes('quotaExceeded')) {
        throw new Error('YouTube API quota exceeded. Please try again later.');
      }
      
      if (error.message.includes('playlistNotFound')) {
        throw new Error('Playlist not found or is private');
      }
      
      throw new Error(`Failed to fetch YouTube playlist: ${error.message}`);
    }
  }

  async getVideoInfo(url) {
    try {
      Logger.info(`Getting video info for: ${url}`);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      const info = await ytdl.getInfo(url, {
        requestOptions: this.ytdlOptions.requestOptions
      });
      
      if (!info) {
        throw new Error('Could not get video details');
      }

      Logger.info(`Successfully got info: ${info.videoDetails.title}`);
      
      return {
        title: info.videoDetails.title,
        duration: parseInt(info.videoDetails.lengthSeconds) || 0,
        thumbnail: info.videoDetails.thumbnails?.[0]?.url,
        url: url,
        author: info.videoDetails.author?.name
      };
    } catch (error) {
      Logger.error('Failed to get video info:', error.message);
      throw new Error(`Failed to get video information: ${error.message}`);
    }
  }

  async getAudioStream(url) {
    try {
      Logger.info(`Creating audio stream for: ${url}`);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

      // Validate URL first
      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL');
      }

      // Get video info to check availability
      const info = await ytdl.getInfo(url, {
        requestOptions: this.ytdlOptions.requestOptions
      });

      if (!info.videoDetails.isLiveContent && info.videoDetails.isPrivate) {
        throw new Error('This video is private');
      }

      if (info.videoDetails.isLiveContent) {
        throw new Error('Live streams are not supported');
      }

      // Create audio stream with enhanced options
      const stream = ytdl(url, {
        ...this.ytdlOptions,
        begin: 0,
        liveBuffer: 1000,
        dlChunkSize: 0,
        bitrate: 128
      });

      // Handle stream errors
      stream.on('error', (error) => {
        Logger.error('ytdl stream error:', error.message);
      });

      stream.on('info', (info) => {
        Logger.info(`Stream info: ${info.videoDetails.title}`);
      });

      Logger.info('Successfully created audio stream via ytdl-core');
      return stream;
    } catch (error) {
      Logger.error('Failed to create audio stream:', error.message);
      
      // Provide specific error messages
      if (error.message.includes('Sign in to confirm') || 
          error.message.includes('bot') ||
          error.message.includes('blocked')) {
        throw new Error('YouTube is blocking requests. Waiting before trying next song...');
      }
      
      if (error.message.includes('Video unavailable') || 
          error.message.includes('private') ||
          error.message.includes('deleted')) {
        throw new Error('This video is unavailable, private, or has been deleted.');
      }

      if (error.message.includes('age-restricted')) {
        throw new Error('This video is age-restricted and cannot be played.');
      }

      if (error.message.includes('Live streams')) {
        throw new Error('Live streams are not supported.');
      }
      
      throw new Error(`Failed to create audio stream: ${error.message}`);
    }
  }

  cleanUrl(url) {
    try {
      const videoId = this.extractVideoId(url);
      return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
    } catch (error) {
      return url;
    }
  }
}

export const youtubeService = new YouTubeService();