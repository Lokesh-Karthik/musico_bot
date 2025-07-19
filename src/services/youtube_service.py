"""
YouTube service for handling YouTube video and playlist integration
"""

import yt_dlp
import asyncio
import logging
from googleapiclient.discovery import build
from src.config import config
from src.utils.logger import get_logger

logger = get_logger(__name__)

class YouTubeService:
    """YouTube service for video and playlist integration"""
    
    def __init__(self):
        # YouTube Data API setup
        if config.YOUTUBE_API_KEY:
            self.youtube = build('youtube', 'v3', developerKey=config.YOUTUBE_API_KEY)
            self.api_enabled = True
            logger.info("YouTube Data API initialized")
        else:
            self.api_enabled = False
            logger.warning("YouTube API key not provided. Search and playlist features disabled.")
        
        # yt-dlp options
        self.ytdl_format_options = {
            'format': 'bestaudio/best',
            'outtmpl': '%(extractor)s-%(id)s-%(title)s.%(ext)s',
            'restrictfilenames': True,
            'noplaylist': True,
            'nocheckcertificate': True,
            'ignoreerrors': False,
            'logtostderr': False,
            'quiet': True,
            'no_warnings': True,
            'default_search': 'auto',
            'source_address': '0.0.0.0'
        }
        
        self.ytdl = yt_dlp.YoutubeDL(self.ytdl_format_options)
    
    def is_youtube_playlist_url(self, url):
        """Check if URL is a YouTube playlist URL"""
        return 'youtube.com/playlist' in url or 'music.youtube.com/playlist' in url
    
    def is_youtube_video_url(self, url):
        """Check if URL is a YouTube video URL"""
        try:
            # Extract info to validate
            info = self.ytdl.extract_info(url, download=False)
            return info is not None
        except:
            return False
    
    def extract_video_id(self, url):
        """Extract video ID from YouTube URL"""
        import re
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com\/v\/([a-zA-Z0-9_-]{11})',
            r'music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    def extract_playlist_id(self, url):
        """Extract playlist ID from YouTube URL"""
        import re
        match = re.search(r'[?&]list=([a-zA-Z0-9_-]+)', url)
        return match.group(1) if match else None
    
    async def search_videos(self, query, max_results=5):
        """Search for videos on YouTube"""
        if not self.api_enabled:
            raise Exception("YouTube API key not configured. Please add YOUTUBE_API_KEY to your .env file.")
        
        try:
            logger.info(f"Searching YouTube for: {query}")
            
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.youtube.search().list(
                    part='snippet',
                    q=query,
                    type='video',
                    maxResults=max_results,
                    order='relevance'
                ).execute()
            )
            
            videos = []
            for item in response['items']:
                videos.append({
                    'title': item['snippet']['title'],
                    'url': f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                    'thumbnail': item['snippet']['thumbnails'].get('default', {}).get('url'),
                    'author': item['snippet']['channelTitle'],
                    'description': item['snippet']['description']
                })
            
            logger.info(f"Found {len(videos)} videos for query: {query}")
            return videos
            
        except Exception as error:
            logger.error(f"YouTube search failed: {error}")
            raise Exception(f"YouTube search failed: {error}")
    
    async def get_playlist_videos(self, playlist_id):
        """Get videos from a YouTube playlist"""
        if not self.api_enabled:
            raise Exception("YouTube API key not configured. Please add YOUTUBE_API_KEY to your .env file.")
        
        try:
            logger.info(f"Fetching YouTube playlist: {playlist_id}")
            
            loop = asyncio.get_event_loop()
            
            # Get playlist info
            playlist_response = await loop.run_in_executor(
                None,
                lambda: self.youtube.playlists().list(
                    part='snippet',
                    id=playlist_id
                ).execute()
            )
            
            if not playlist_response['items']:
                raise Exception("Playlist not found or is private")
            
            playlist_info = playlist_response['items'][0]
            videos = []
            next_page_token = None
            
            while True:
                # Get playlist items
                response = await loop.run_in_executor(
                    None,
                    lambda: self.youtube.playlistItems().list(
                        part='snippet',
                        playlistId=playlist_id,
                        maxResults=50,
                        pageToken=next_page_token
                    ).execute()
                )
                
                for item in response['items']:
                    if (item['snippet']['title'] != 'Private video' and 
                        item['snippet']['title'] != 'Deleted video'):
                        
                        videos.append({
                            'title': item['snippet']['title'],
                            'url': f"https://www.youtube.com/watch?v={item['snippet']['resourceId']['videoId']}",
                            'thumbnail': item['snippet']['thumbnails'].get('default', {}).get('url'),
                            'author': item['snippet'].get('videoOwnerChannelTitle', item['snippet']['channelTitle']),
                            'description': item['snippet']['description']
                        })
                
                next_page_token = response.get('nextPageToken')
                if not next_page_token:
                    break
            
            logger.info(f"Found {len(videos)} videos in playlist: {playlist_info['snippet']['title']}")
            
            return {
                'name': playlist_info['snippet']['title'],
                'description': playlist_info['snippet']['description'],
                'videos': videos
            }
            
        except Exception as error:
            logger.error(f"Failed to fetch YouTube playlist: {error}")
            raise Exception(f"Failed to fetch YouTube playlist: {error}")
    
    async def get_video_info(self, url):
        """Get video information from YouTube URL"""
        try:
            logger.info(f"Getting video info for: {url}")
            
            loop = asyncio.get_event_loop()
            
            # Extract info using yt-dlp
            info = await loop.run_in_executor(
                None,
                lambda: self.ytdl.extract_info(url, download=False)
            )
            
            if not info:
                raise Exception("Could not get video details")
            
            logger.info(f"Successfully got info for: {info.get('title', 'Unknown')}")
            
            return {
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration', 0),
                'thumbnail': info.get('thumbnail'),
                'url': url,
                'author': info.get('uploader', 'Unknown')
            }
            
        except Exception as error:
            logger.error(f"Failed to get video info: {error}")
            raise Exception("Failed to get video information. This might be due to YouTube restrictions or the video being unavailable.")
    
    def clean_url(self, url):
        """Clean and normalize YouTube URL"""
        try:
            video_id = self.extract_video_id(url)
            return f"https://www.youtube.com/watch?v={video_id}" if video_id else url
        except:
            return url