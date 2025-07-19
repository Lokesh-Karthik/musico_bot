"""
Music commands for Discord bot
"""

import discord
from discord.ext import commands
from discord import app_commands
import asyncio
import logging
from src.services.music_player import MusicPlayer
from src.services.spotify_service import SpotifyService
from src.services.youtube_service import YouTubeService
from src.utils.logger import get_logger

logger = get_logger(__name__)

class MusicCog(commands.Cog):
    """Music commands cog"""
    
    def __init__(self, bot):
        self.bot = bot
        self.music_player = MusicPlayer()
        self.spotify_service = SpotifyService()
        self.youtube_service = YouTubeService()
    
    async def cog_check(self, ctx):
        """Check if user is in a voice channel"""
        if not ctx.author.voice:
            await ctx.send("You need to be in a voice channel to use music commands!")
            return False
        return True
    
    @commands.command(name='play', aliases=['p'])
    async def play_command(self, ctx, *, query: str = None):
        """Play music from YouTube/Spotify URL or search query"""
        if not query:
            await ctx.send("Please provide a YouTube/Spotify URL or search query!")
            return
        
        await self._play_music(ctx, query)
    
    @app_commands.command(name="play", description="Play music from YouTube/Spotify URL or search query")
    async def play_slash(self, interaction: discord.Interaction, query: str):
        """Slash command for playing music"""
        await interaction.response.defer()
        
        # Create a mock context for compatibility
        ctx = await self.bot.get_context(interaction)
        ctx.send = interaction.followup.send
        
        await self._play_music(ctx, query)
    
    async def _play_music(self, ctx, query: str):
        """Internal method to handle music playing logic"""
        try:
            processing_msg = await ctx.send("🔍 Processing your request...")
            
            # Join voice channel
            voice_channel = ctx.author.voice.channel
            await self.music_player.join_channel(voice_channel)
            
            # Handle Spotify playlist
            if self.spotify_service.is_spotify_url(query):
                playlist_id = self.spotify_service.extract_playlist_id(query)
                if not playlist_id:
                    await processing_msg.edit(content="❌ Invalid Spotify playlist URL!")
                    return
                
                playlist = await self.spotify_service.get_playlist_tracks(playlist_id)
                added_count = await self.music_player.add_playlist_to_queue(
                    ctx.guild.id, playlist, ctx.author
                )
                
                await processing_msg.edit(
                    content=f"✅ Added {added_count} songs from **{playlist['name']}** to the queue!"
                )
                return
            
            # Handle YouTube playlist
            if self.youtube_service.is_youtube_playlist_url(query):
                playlist_id = self.youtube_service.extract_playlist_id(query)
                if not playlist_id:
                    await processing_msg.edit(content="❌ Invalid YouTube playlist URL!")
                    return
                
                playlist = await self.youtube_service.get_playlist_videos(playlist_id)
                added_count = await self.music_player.add_playlist_to_queue(
                    ctx.guild.id, playlist, ctx.author
                )
                
                await processing_msg.edit(
                    content=f"✅ Added {added_count} videos from **{playlist['name']}** to the queue!"
                )
                return
            
            # Handle single YouTube video
            if self.youtube_service.is_youtube_video_url(query):
                video_info = await self.youtube_service.get_video_info(query)
                await self.music_player.add_to_queue(ctx.guild.id, video_info, ctx.author)
                await processing_msg.edit(content=f"✅ Added **{video_info['title']}** to the queue!")
                return
            
            # Handle search query
            search_results = await self.youtube_service.search_videos(query, 1)
            if not search_results:
                await processing_msg.edit(content="❌ No videos found for your search query!")
                return
            
            video = search_results[0]
            await self.music_player.add_to_queue(ctx.guild.id, video, ctx.author)
            await processing_msg.edit(content=f"✅ Added **{video['title']}** to the queue!")
            
        except Exception as error:
            logger.error(f"Play command error: {error}")
            await ctx.send(f"❌ {error}")
    
    @commands.command(name='search')
    async def search_command(self, ctx, *, query: str = None):
        """Search for videos on YouTube"""
        if not query:
            await ctx.send("Please provide a search query!")
            return
        
        try:
            search_results = await self.youtube_service.search_videos(query, 5)
            
            if not search_results:
                await ctx.send("❌ No videos found for your search query!")
                return
            
            embed = discord.Embed(
                title=f"🔍 Search Results for: {query}",
                color=0x00ff00
            )
            
            description = ""
            for i, video in enumerate(search_results, 1):
                description += f"**{i}.** [{video['title']}]({video['url']})\n"
                description += f"*by {video.get('author', 'Unknown')}*\n\n"
            
            embed.description = description
            embed.set_footer(text="Use !play [URL] to add a video to the queue")
            
            await ctx.send(embed=embed)
            
        except Exception as error:
            logger.error(f"Search command error: {error}")
            await ctx.send(f"❌ {error}")
    
    @commands.command(name='skip', aliases=['s'])
    async def skip_command(self, ctx):
        """Skip the current song"""
        if self.music_player.skip(ctx.guild.id):
            await ctx.send("⏭️ Skipped to the next song!")
        else:
            await ctx.send("❌ No songs to skip!")
    
    @commands.command(name='pause')
    async def pause_command(self, ctx):
        """Pause the current song"""
        self.music_player.pause(ctx.guild.id)
        await ctx.send("⏸️ Paused the music!")
    
    @commands.command(name='resume', aliases=['r'])
    async def resume_command(self, ctx):
        """Resume the current song"""
        self.music_player.resume(ctx.guild.id)
        await ctx.send("▶️ Resumed the music!")
    
    @commands.command(name='stop')
    async def stop_command(self, ctx):
        """Stop music and clear the queue"""
        self.music_player.stop(ctx.guild.id)
        await ctx.send("⏹️ Stopped the music and cleared the queue!")
    
    @commands.command(name='queue', aliases=['q'])
    async def queue_command(self, ctx):
        """Show the current music queue"""
        queue = self.music_player.get_current_queue(ctx.guild.id)
        current_track = self.music_player.get_current_track(ctx.guild.id)
        
        if not queue:
            await ctx.send("📭 The queue is empty!")
            return
        
        embed = discord.Embed(title="🎵 Music Queue", color=0x00ff00)
        
        description = ""
        
        # Show currently playing song
        if current_track:
            description += f"**🎵 Now Playing:**\n"
            description += f"{current_track['title']}"
            if current_track.get('author'):
                description += f" by {current_track['author']}"
            description += f" (requested by {current_track['requested_by'].display_name})\n\n"
        
        # Show upcoming songs
        upcoming_songs = queue[1:11] if current_track else queue[:10]
        if upcoming_songs:
            description += "**📋 Up Next:**\n"
            for i, track in enumerate(upcoming_songs, 1):
                position = i + 1 if current_track else i
                description += f"{position}. **{track['title']}"
                if track.get('author'):
                    description += f" by {track['author']}"
                description += f"** (requested by {track['requested_by'].display_name})\n"
        
        embed.description = description
        
        footer_text = f"{len(queue)} song(s) in queue"
        if len(queue) > 10:
            footer_text = f"... and {len(queue) - 10} more songs"
        embed.set_footer(text=footer_text)
        
        await ctx.send(embed=embed)
    
    @commands.command(name='nowplaying', aliases=['np'])
    async def nowplaying_command(self, ctx):
        """Show the currently playing song"""
        current_track = self.music_player.get_current_track(ctx.guild.id)
        
        if not current_track:
            await ctx.send("❌ Nothing is currently playing!")
            return
        
        embed = discord.Embed(title="🎵 Now Playing", color=0x00ff00)
        
        description = f"**{current_track['title']}**\n"
        if current_track.get('author'):
            description += f"by {current_track['author']}\n"
        description += f"Requested by {current_track['requested_by'].display_name}"
        
        embed.description = description
        
        if current_track.get('thumbnail'):
            embed.set_thumbnail(url=current_track['thumbnail'])
        
        await ctx.send(embed=embed)
    
    @commands.command(name='leave', aliases=['disconnect'])
    async def leave_command(self, ctx):
        """Leave the voice channel"""
        if self.music_player.leave(ctx.guild.id):
            await ctx.send("👋 Left the voice channel!")
        else:
            await ctx.send("❌ I'm not in a voice channel!")
    
    @commands.command(name='help')
    async def help_command(self, ctx):
        """Show help message"""
        embed = discord.Embed(
            title="🎵 Music Bot Commands",
            description="Here are all the available commands:",
            color=0x00ff00
        )
        
        music_commands = [
            f"`{ctx.prefix}play [URL/search]` - Play music from YouTube/Spotify",
            f"`{ctx.prefix}skip` - Skip current song",
            f"`{ctx.prefix}pause` - Pause current song",
            f"`{ctx.prefix}resume` - Resume current song",
            f"`{ctx.prefix}stop` - Stop music and clear queue",
            f"`{ctx.prefix}queue` - Show current queue",
            f"`{ctx.prefix}leave` - Leave voice channel",
            f"`{ctx.prefix}search [query]` - Search for videos",
            f"`{ctx.prefix}nowplaying` - Show currently playing song",
        ]
        
        embed.add_field(
            name="🎵 Music Commands",
            value="\n".join(music_commands),
            inline=False
        )
        
        examples = [
            f"`{ctx.prefix}play https://open.spotify.com/playlist/...`",
            f"`{ctx.prefix}play https://www.youtube.com/watch?v=...`",
            f"`{ctx.prefix}play https://www.youtube.com/playlist?list=...`",
            "You can also use `/` slash commands (just type `/` and see the options):",
            "`/play`, `/skip`, `/queue`, `/help`, etc."
        ]
        
        embed.add_field(
            name="📝 Usage Examples",
            value="\n".join(examples),
            inline=False
        )
        
        embed.set_footer(text="Supports YouTube/Spotify playlists and search!")
        
        await ctx.send(embed=embed)
    
    # Slash command versions
    @app_commands.command(name="skip", description="Skip the current song")
    async def skip_slash(self, interaction: discord.Interaction):
        ctx = await self.bot.get_context(interaction)
        await interaction.response.defer()
        await self.skip_command(ctx)
    
    @app_commands.command(name="pause", description="Pause the current song")
    async def pause_slash(self, interaction: discord.Interaction):
        ctx = await self.bot.get_context(interaction)
        await interaction.response.defer()
        await self.pause_command(ctx)
    
    @app_commands.command(name="resume", description="Resume the current song")
    async def resume_slash(self, interaction: discord.Interaction):
        ctx = await self.bot.get_context(interaction)
        await interaction.response.defer()
        await self.resume_command(ctx)
    
    @app_commands.command(name="stop", description="Stop music and clear the queue")
    async def stop_slash(self, interaction: discord.Interaction):
        ctx = await self.bot.get_context(interaction)
        await interaction.response.defer()
        await self.stop_command(ctx)
    
    @app_commands.command(name="queue", description="Show the current music queue")
    async def queue_slash(self, interaction: discord.Interaction):
        ctx = await self.bot.get_context(interaction)
        await interaction.response.defer()
        await self.queue_command(ctx)
    
    @app_commands.command(name="nowplaying", description="Show the currently playing song")
    async def nowplaying_slash(self, interaction: discord.Interaction):
        ctx = await self.bot.get_context(interaction)
        await interaction.response.defer()
        await self.nowplaying_command(ctx)
    
    @app_commands.command(name="leave", description="Leave the voice channel")
    async def leave_slash(self, interaction: discord.Interaction):
        ctx = await self.bot.get_context(interaction)
        await interaction.response.defer()
        await self.leave_command(ctx)
    
    @app_commands.command(name="help", description="Show all available commands")
    async def help_slash(self, interaction: discord.Interaction):
        ctx = await self.bot.get_context(interaction)
        await interaction.response.defer()
        await self.help_command(ctx)