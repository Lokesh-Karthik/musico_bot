import SpotifyWebApi from 'spotify-web-api-node';
import { config } from '../config.js';
import { Logger } from '../utils/logger.js';

class SpotifyService {
  constructor() {
    if (!config.spotify.clientId || !config.spotify.clientSecret) {
      Logger.warn('Spotify credentials not configured. Spotify support disabled.');
      this.enabled = false;
      return;
    }

    // Validate credentials format
    if (config.spotify.clientId.trim() === '' || config.spotify.clientSecret.trim() === '') {
      Logger.warn('Spotify credentials are empty. Spotify support disabled.');
      this.enabled = false;
      return;
    }

    this.spotify = new SpotifyWebApi({
      clientId: config.spotify.clientId,
      clientSecret: config.spotify.clientSecret,
    });
    
    this.enabled = true;
    this.authenticate();
  }

  async authenticate() {
    if (!this.enabled) {
      return;
    }

    try {
      const data = await this.spotify.clientCredentialsGrant();
      this.spotify.setAccessToken(data.body.access_token);
      Logger.info('Spotify API authenticated successfully');
      
      // Refresh token before it expires
      setTimeout(() => this.authenticate(), (data.body.expires_in - 300) * 1000);
    } catch (error) {
      Logger.warn('Spotify authentication failed - check your credentials in .env file');
      Logger.warn('Spotify features will be disabled. YouTube search will still work.');
      this.enabled = false;
    }
  }

  isSpotifyUrl(url) {
    return url.includes('spotify.com/playlist/') || url.includes('open.spotify.com/playlist/');
  }

  extractPlaylistId(url) {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  async getPlaylistTracks(playlistId) {
    if (!this.enabled) {
      throw new Error('Spotify service is not enabled');
    }

    try {
      const playlist = await this.spotify.getPlaylist(playlistId);
      const tracks = [];
      
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.spotify.getPlaylistTracks(playlistId, {
          offset,
          limit,
          fields: 'items(track(name,artists(name),duration_ms)),next'
        });

        const items = response.body.items.filter(item => item.track && item.track.name);
        
        tracks.push(...items.map(item => ({
          title: item.track.name,
          artist: item.track.artists.map(artist => artist.name).join(', '),
          duration: item.track.duration_ms,
          searchQuery: `${item.track.name} ${item.track.artists[0].name}`
        })));

        hasMore = response.body.next !== null;
        offset += limit;
      }

      Logger.info(`Found ${tracks.length} tracks in Spotify playlist: ${playlist.body.name}`);
      return {
        name: playlist.body.name,
        tracks
      };
    } catch (error) {
      Logger.error('Failed to fetch Spotify playlist:', error.message);
      throw new Error('Failed to fetch Spotify playlist');
    }
  }
}

export const spotifyService = new SpotifyService();