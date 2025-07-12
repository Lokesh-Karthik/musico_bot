import { YtDlp } from 'node-yt-dlp';
import { google } from 'googleapis';
import { config } from '../config.js';
import { Logger } from '../utils/logger.js';

class YouTubeService {
  constructor() {
    // Initialize yt-dlp
    this.ytdlp = new YtDlp();
    
    // Initialize YouTube API if key is provided
    if (config.youtube.apiKey) {
      this.youtube = google.youtube({
        version: 'v3',
        auth: config.youtube.apiKey
      });
      this.apiEnabled = true;
      Logger.info('YouTube Data API initialized');
    } else {
      this.apiEnabled = false;
      Logger.warn('YouTube API key not provided. Search and playlist features disabled.');
    }

    Logger.info('YouTube service initialized with yt-dlp');
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
      const info = await this.ytdlp.getVideoInfo(url);
      return !!info;
    } catch (error) {
      return false;
    }
  }

  async searchVideos(query, maxResults = 5) {
    if (!this.apiEnabled) {
      throw new Error('YouTube API key not configured. Please add YOUTUBE_API_KEY to your .env file.');
    }

    try {
      Logger.info(`Searching YouTube for: ${query}`);
      
      const response = await this.youtube.search.list({
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: maxResults,
        order: 'relevance'
      });

      const videos = response.data.items.map(item => ({
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnail: item.snippet.thumbnails?.default?.url,
        author: item.snippet.channelTitle,
        description: item.snippet.description
      }));

      Logger.info(`Found ${videos.length} videos for query: ${query}`);
      return videos;
    } catch (error) {
      Logger.error('YouTube search failed:', error.message);
      throw new Error(`YouTube search failed: ${error.message}`);
    }
  }

  async getPlaylistVideos(playlistId) {
    if (!this.apiEnabled) {
      throw new Error('YouTube API key not configured. Please add YOUTUBE_API_KEY to your .env file.');
    }

    try {
      Logger.info(`Fetching YouTube playlist: ${playlistId}`);
      
      // Get playlist info
      const playlistResponse = await this.youtube.playlists.list({
        part: 'snippet',
        id: playlistId
      });

      if (!playlistResponse.data.items.length) {
        throw new Error('Playlist not found or is private');
      }

      const playlistInfo = playlistResponse.data.items[0];
      const videos = [];
      let nextPageToken = null;

      do {
        const response = await this.youtube.playlistItems.list({
          part: 'snippet',
          playlistId: playlistId,
          maxResults: 50,
          pageToken: nextPageToken
        });

        const items = response.data.items.filter(item => 
          item.snippet.title !== 'Private video' && 
          item.snippet.title !== 'Deleted video'
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
        description: playlistInfo.snippet.description,
        videos: videos
      };
    } catch (error) {
      Logger.error('Failed to fetch YouTube playlist:', error.message);
      throw new Error(`Failed to fetch YouTube playlist: ${error.message}`);
    }
  }

  async getVideoInfo(url) {
    try {
      Logger.info(`Getting video info for: ${url}`);
      
      const info = await this.ytdlp.getVideoInfo(url, {
        dumpSingleJson: true,
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true
      });
      
      if (!info) {
        throw new Error('Could not get video details');
      }

      Logger.info(`Successfully got info via yt-dlp: ${info.title}`);
      
      return {
        title: info.title,
        duration: info.duration || 0,
        thumbnail: info.thumbnail,
        url: url,
        author: info.uploader || info.channel
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

      const stream = await this.ytdlp.exec(url, {
        format: 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
        output: '-',
        quiet: true,
        noWarnings: true,
        extractFlat: false,
        audioFormat: 'best',
        audioQuality: 0,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
        addHeader: [
          'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      });
      
      if (!stream) {
        throw new Error('Failed to create audio stream');
      }

      Logger.info('Successfully created audio stream via yt-dlp');
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