"""
Music player service for handling audio playback
"""

import discord
import asyncio
import logging
from src.services.youtube_service import YouTubeService
from src.utils.logger import get_logger

logger = get_logger(__name__)

class MusicPlayer:
    """Music player class for handling audio playback"""
    
    def __init__(self):
        self.queues = {}
        self.voice_clients = {}
        self.currently_playing = {}
        self.is_playing = {}
        self.youtube_service = YouTubeService()
    
    def get_queue(self, guild_id):
        """Get queue for a guild"""
        if guild_id not in self.queues:
            self.queues[guild_id] = []
        return self.queues[guild_id]
    
    async def join_channel(self, voice_channel):
        """Join a voice channel"""
        try:
            guild_id = voice_channel.guild.id
            
            # If already connected to a different channel, move
            if guild_id in self.voice_clients:
                await self.voice_clients[guild_id].move_to(voice_channel)
            else:
                voice_client = await voice_channel.connect()
                self.voice_clients[guild_id] = voice_client
            
            logger.info(f"Joined voice channel in guild {guild_id}")
            return self.voice_clients[guild_id]
            
        except Exception as error:
            logger.error(f"Failed to join voice channel: {error}")
            raise error
    
    async def add_to_queue(self, guild_id, track, requested_by):
        """Add a single track to the queue"""
        queue = self.get_queue(guild_id)
        
        queue_item = {
            **track,
            'requested_by': requested_by,
            'added_at': asyncio.get_event_loop().time()
        }
        
        queue.append(queue_item)
        logger.info(f"Added to queue: {track['title']} (Guild: {guild_id})")
        
        # Start playing if nothing is currently playing
        if not self.is_playing.get(guild_id, False):
            await self.play_next(guild_id)
        
        return queue_item
    
    async def add_playlist_to_queue(self, guild_id, playlist, requested_by):
        """Add a playlist to the queue"""
        queue = self.get_queue(guild_id)
        
        tracks = playlist.get('tracks', playlist.get('videos', []))
        
        for track in tracks:
            queue_item = {
                **track,
                'requested_by': requested_by,
                'added_at': asyncio.get_event_loop().time(),
                'is_playlist': True
            }
            queue.append(queue_item)
        
        logger.info(f"Added {len(tracks)} songs from playlist to queue (Guild: {guild_id})")
        
        # Start playing if nothing is currently playing
        if not self.is_playing.get(guild_id, False):
            await self.play_next(guild_id)
        
        return len(tracks)
    
    async def play_next(self, guild_id):
        """Play the next song in the queue"""
        queue = self.get_queue(guild_id)
        voice_client = self.voice_clients.get(guild_id)
        
        if not queue or not voice_client:
            logger.info(f"Queue empty or no voice client for guild {guild_id}")
            self.is_playing[guild_id] = False
            if guild_id in self.currently_playing:
                del self.currently_playing[guild_id]
            return
        
        track = queue.pop(0)
        self.currently_playing[guild_id] = track
        
        try:
            logger.info(f"Preparing to play: {track['title']} (Guild: {guild_id})")
            
            # Get audio URL
            audio_url = track.get('url')
            
            # If it's a Spotify track or search query, search for it on YouTube
            if track.get('search_query') and not audio_url:
                logger.info(f"Searching YouTube for: {track['search_query']}")
                search_results = await self.youtube_service.search_videos(track['search_query'], 1)
                
                if not search_results:
                    logger.error(f"No YouTube results found for: {track['search_query']}")
                    await self.play_next(guild_id)
                    return
                
                audio_url = search_results[0]['url']
                track['url'] = audio_url
                logger.info(f"Found YouTube URL: {audio_url}")
            
            if not audio_url:
                logger.error(f"No URL available for track: {track['title']}")
                await self.play_next(guild_id)
                return
            
            # Create audio source
            logger.info(f"Creating audio source for: {audio_url}")
            
            # Use yt-dlp to get the audio stream
            ytdl_format_options = {
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
            
            ffmpeg_options = {
                'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
                'options': '-vn'
            }
            
            audio_source = discord.FFmpegPCMAudio(
                audio_url,
                **ffmpeg_options,
                executable='ffmpeg'
            )
            
            # Play the audio
            def after_playing(error):
                if error:
                    logger.error(f"Player error: {error}")
                else:
                    logger.info(f"Finished playing: {track['title']}")
                
                # Schedule next song
                asyncio.run_coroutine_threadsafe(
                    self.play_next(guild_id),
                    asyncio.get_event_loop()
                )
            
            voice_client.play(audio_source, after=after_playing)
            self.is_playing[guild_id] = True
            
            logger.info(f"Now playing: {track['title']} (Guild: {guild_id})")
            
        except Exception as error:
            logger.error(f"Failed to play track: {track['title']} - {error}")
            logger.info("Attempting to play next track...")
            self.is_playing[guild_id] = False
            await self.play_next(guild_id)
    
    def skip(self, guild_id):
        """Skip the current song"""
        voice_client = self.voice_clients.get(guild_id)
        
        if voice_client and voice_client.is_playing():
            voice_client.stop()
            return True
        return False
    
    def pause(self, guild_id):
        """Pause the current song"""
        voice_client = self.voice_clients.get(guild_id)
        
        if voice_client and voice_client.is_playing():
            voice_client.pause()
            return True
        return False
    
    def resume(self, guild_id):
        """Resume the current song"""
        voice_client = self.voice_clients.get(guild_id)
        
        if voice_client and voice_client.is_paused():
            voice_client.resume()
            return True
        return False
    
    def stop(self, guild_id):
        """Stop music and clear queue"""
        queue = self.get_queue(guild_id)
        voice_client = self.voice_clients.get(guild_id)
        
        queue.clear()
        self.is_playing[guild_id] = False
        
        if guild_id in self.currently_playing:
            del self.currently_playing[guild_id]
        
        if voice_client:
            voice_client.stop()
    
    def get_current_queue(self, guild_id):
        """Get the current queue including currently playing song"""
        queue = self.get_queue(guild_id)
        current_track = self.currently_playing.get(guild_id)
        
        if current_track:
            return [current_track] + queue
        return queue
    
    def get_current_track(self, guild_id):
        """Get the currently playing track"""
        return self.currently_playing.get(guild_id)
    
    async def leave(self, guild_id):
        """Leave the voice channel"""
        voice_client = self.voice_clients.get(guild_id)
        
        if voice_client:
            self.stop(guild_id)
            await voice_client.disconnect()
            del self.voice_clients[guild_id]
            return True
        return False