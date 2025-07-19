"""
Main Discord Bot class
"""

import discord
from discord.ext import commands
import logging
from src.config import config, validate_config
from src.commands.music import MusicCog
from src.utils.logger import get_logger

logger = get_logger(__name__)

class DiscordMusicBot(commands.Bot):
    """Main Discord Music Bot class"""
    
    def __init__(self):
        # Validate configuration
        validate_config()
        
        # Set up intents
        intents = discord.Intents.default()
        intents.message_content = True
        intents.voice_states = True
        
        # Initialize bot
        super().__init__(
            command_prefix=config.PREFIX,
            intents=intents,
            help_command=None
        )
        
        # Setup event handlers
        self.setup_events()
    
    def setup_events(self):
        """Setup bot event handlers"""
        
        @self.event
        async def on_ready():
            logger.info(f"🤖 Bot is ready! Logged in as {self.user}")
            logger.info(f"📊 Serving {len(self.guilds)} guilds")
            
            # Set bot activity
            activity = discord.Activity(
                type=discord.ActivityType.listening,
                name=f"🎵 Music | {config.PREFIX}help for commands"
            )
            await self.change_presence(activity=activity)
            
            # Sync slash commands
            try:
                synced = await self.tree.sync()
                logger.info(f"✅ Synced {len(synced)} slash commands")
            except Exception as e:
                logger.error(f"Failed to sync slash commands: {e}")
        
        @self.event
        async def on_command_error(ctx, error):
            """Handle command errors"""
            if isinstance(error, commands.CommandNotFound):
                return
            elif isinstance(error, commands.MissingRequiredArgument):
                await ctx.send(f"❌ Missing required argument: {error.param}")
            elif isinstance(error, commands.BadArgument):
                await ctx.send(f"❌ Invalid argument provided")
            else:
                logger.error(f"Command error: {error}")
                await ctx.send("❌ An error occurred while executing the command!")
        
        @self.event
        async def on_disconnect():
            logger.warning("Bot disconnected from Discord")
        
        @self.event
        async def on_resumed():
            logger.info("Bot reconnected to Discord")
    
    async def setup_hook(self):
        """Setup hook called when bot is starting"""
        # Add cogs
        await self.add_cog(MusicCog(self))
        logger.info("✅ Music cog loaded")
    
    async def start(self):
        """Start the bot"""
        try:
            await super().start(config.DISCORD_TOKEN)
        except Exception as error:
            logger.error(f"Failed to start bot: {error}")
            raise
    
    async def close(self):
        """Close the bot gracefully"""
        logger.info("🛑 Shutting down Discord Music Bot...")
        await super().close()