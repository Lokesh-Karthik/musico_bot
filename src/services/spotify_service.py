"""
Spotify service for handling Spotify playlist integration
"""

import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import logging
from src.config import config
from src.utils.logger import get_logger

logger = get_logger(__name__)

class SpotifyService:
    """Spotify service for playlist integration"""
    
    def __init__(self):
        if not config.SPOTIFY_CLIENT_ID or not config.SPOTIFY_CLIENT_SECRET:
            logger.warning("Spotify credentials not configured. Spotify support disabled.")
            self.enabled = False
            return
        
        # Validate credentials format
        if not config.SPOTIFY_CLIENT_ID.strip() or not config.SPOTIFY_CLIENT_SECRET.strip():
            logger.warning("Spotify credentials are empty. Spotify support disabled.")
            self.enabled = False
            return
        
        try:
            # Initialize Spotify client
            client_credentials_manager = SpotifyClientCredentials(
                client_id=config.SPOTIFY_CLIENT_ID,
                client_secret=config.SPOTIFY_CLIENT_SECRET
            )
            
            self.spotify = spotipy.Spotify(
                client_credentials_manager=client_credentials_manager
            )
            
            self.enabled = True
            logger.info("Spotify API authenticated successfully")
            
        except Exception as error:
            logger.warning(f"Spotify authentication failed: {error}")
            logger.warning("Spotify features will be disabled. YouTube search will still work.")
            self.enabled = False
    
    def is_spotify_url(self, url):
        """Check if URL is a Spotify playlist URL"""
        return 'spotify.com/playlist/' in url or 'open.spotify.com/playlist/' in url
    
    def extract_playlist_id(self, url):
        """Extract playlist ID from Spotify URL"""
        import re
        match = re.search(r'playlist/([a-zA-Z0-9]+)', url)
        return match.group(1) if match else None
    
    async def get_playlist_tracks(self, playlist_id):
        """Get tracks from a Spotify playlist"""
        if not self.enabled:
            raise Exception("Spotify service is not enabled")
        
        try:
            # Get playlist info
            playlist = self.spotify.playlist(playlist_id)
            tracks = []
            
            # Get all tracks (handle pagination)
            results = self.spotify.playlist_tracks(playlist_id)
            
            while results:
                for item in results['items']:
                    if item['track'] and item['track']['name']:
                        track = item['track']
                        artists = ', '.join([artist['name'] for artist in track['artists']])
                        
                        tracks.append({
                            'title': track['name'],
                            'artist': artists,
                            'duration': track['duration_ms'],
                            'search_query': f"{track['name']} {track['artists'][0]['name']}"
                        })
                
                # Get next page if available
                results = self.spotify.next(results) if results['next'] else None
            
            logger.info(f"Found {len(tracks)} tracks in Spotify playlist: {playlist['name']}")
            
            return {
                'name': playlist['name'],
                'tracks': tracks
            }
            
        except Exception as error:
            logger.error(f"Failed to fetch Spotify playlist: {error}")
            raise Exception("Failed to fetch Spotify playlist")