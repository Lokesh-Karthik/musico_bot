import ytdl from '@distube/ytdl-core';
import { google } from 'googleapis';
import { config } from '../config.js';
import { Logger } from '../utils/logger.js';

class YouTubeService {
  constructor() {
    this.streamOptions = {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25
    };

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
  }

  isYouTubePlaylistUrl(url) {
    return url.includes('youtube.com/playlist') || url.includes('music.youtube.com/playlist');
  }

  isYouTubeVideoUrl(url) {
    try {
      return ytdl.validateURL(url);
    } catch (error) {
      return false;
    }
  }

  extractVideoId(url) {
    try {
      return ytdl.getVideoID(url);
    } catch (error) {
      return null;
    }
  }

  extractPlaylistId(url) {
    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  async validateVideo(url) {
    try {
      return ytdl.validateURL(url);
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
      
      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL');
      }

      // Add retry logic for extraction issues
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const info = await ytdl.getInfo(url, {
            requestOptions: {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            }
          });
          
          if (!info || !info.videoDetails) {
            throw new Error('Could not get video details');
          }

          Logger.info(`Successfully got info for: ${info.videoDetails.title}`);
          
          return {
            title: info.videoDetails.title,
            duration: parseInt(info.videoDetails.lengthSeconds) || 0,
            thumbnail: info.videoDetails.thumbnails?.[0]?.url,
            url: url,
            author: info.videoDetails.author?.name
          };
        } catch (error) {
          attempts++;
          Logger.warn(`Attempt ${attempts} failed: ${error.message}`);
          
          if (attempts >= maxAttempts) {
            throw error;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    } catch (error) {
      Logger.error('Failed to get video info:', error.message);
      throw new Error(`Failed to get video information. This might be due to YouTube restrictions or the video being unavailable.`);
    }
  }

  async getAudioStream(url) {
    try {
      Logger.info(`Creating audio stream for: ${url}`);
      
      if (!ytdl.validateURL(url)) {
        throw new Error('Invalid YouTube URL');
      }

      const stream = ytdl(url, {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      });

      Logger.info('Successfully created audio stream');
      return stream;
    } catch (error) {
      Logger.error('Failed to create audio stream:', error.message);
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