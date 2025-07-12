import { spawn } from 'child_process';
import { config } from '../config.js';
import { Logger } from '../utils/logger.js';

class YouTubeService {
  constructor() {
    this.ensureYtDlp();
    Logger.info('YouTube service initialized with yt-dlp binary');
  }

  async ensureYtDlp() {
    try {
      // Check if yt-dlp is available
      const { stdout } = await this.execCommand('yt-dlp', ['--version']);
      Logger.info(`yt-dlp version: ${stdout.trim()}`);
    } catch (error) {
      Logger.error('yt-dlp not found. Please install it: https://github.com/yt-dlp/yt-dlp#installation');
      throw new Error('yt-dlp binary not found. Please install yt-dlp.');
    }
  }

  execCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        ...options
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
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
      await this.execCommand('yt-dlp', ['--simulate', '--quiet', url]);
      return true;
    } catch (error) {
      return false;
    }
  }

  async searchVideos(query, maxResults = 5) {
    try {
      Logger.info(`Searching YouTube for: ${query}`);
      
      const { stdout } = await this.execCommand('yt-dlp', [
        '--dump-json',
        '--flat-playlist',
        '--quiet',
        `ytsearch${maxResults}:${query}`
      ]);

      const videos = stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            const data = JSON.parse(line);
            return {
              title: data.title,
              url: `https://www.youtube.com/watch?v=${data.id}`,
              thumbnail: data.thumbnail,
              author: data.uploader || data.channel,
              description: data.description || ''
            };
          } catch (e) {
            return null;
          }
        })
        .filter(video => video !== null);

      Logger.info(`Found ${videos.length} videos for query: ${query}`);
      return videos;
    } catch (error) {
      Logger.error('YouTube search failed:', error.message);
      throw new Error(`YouTube search failed: ${error.message}`);
    }
  }

  async getPlaylistVideos(playlistId) {
    try {
      Logger.info(`Fetching YouTube playlist: ${playlistId}`);
      
      const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
      
      const { stdout } = await this.execCommand('yt-dlp', [
        '--dump-json',
        '--flat-playlist',
        '--quiet',
        playlistUrl
      ]);

      const videos = stdout.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            const data = JSON.parse(line);
            return {
              title: data.title,
              url: `https://www.youtube.com/watch?v=${data.id}`,
              thumbnail: data.thumbnail,
              author: data.uploader || data.channel,
              description: data.description || ''
            };
          } catch (e) {
            return null;
          }
        })
        .filter(video => video !== null);

      Logger.info(`Found ${videos.length} videos in playlist`);
      
      return {
        name: `YouTube Playlist (${videos.length} videos)`,
        description: 'YouTube playlist',
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
      
      const { stdout } = await this.execCommand('yt-dlp', [
        '--dump-json',
        '--quiet',
        url
      ]);
      
      const info = JSON.parse(stdout.trim());
      
      if (!info) {
        throw new Error('Could not get video details');
      }

      Logger.info(`Successfully got info: ${info.title}`);
      
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

      const args = [
        '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
        '--output', '-',
        '--quiet',
        '--no-warnings',
        '--extract-flat', 'false',
        '--audio-format', 'best',
        '--audio-quality', '0',
        '--prefer-free-formats',
        '--youtube-skip-dash-manifest',
        '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        url
      ];

      const process = spawn('yt-dlp', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let errorOutput = '';
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('error', (error) => {
        Logger.error('yt-dlp process error:', error.message);
        throw new Error(`Failed to start yt-dlp: ${error.message}`);
      });

      process.on('close', (code) => {
        if (code !== 0) {
          Logger.error('yt-dlp failed:', errorOutput);
        }
      });
      
      if (!process.stdout) {
        throw new Error('Failed to create audio stream');
      }

      Logger.info('Successfully created audio stream via yt-dlp');
      return process.stdout;
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