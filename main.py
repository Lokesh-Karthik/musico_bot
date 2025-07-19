#!/usr/bin/env python3
"""
Discord Music Bot - Main Entry Point
"""

import asyncio
import logging
import os
from src.bot import DiscordMusicBot
from src.utils.logger import setup_logger

async def main():
    """Main function to start the Discord Music Bot"""
    try:
        # Setup logging
        setup_logger()
        logging.info("🚀 Starting Discord Music Bot...")
        
        # Create and start the bot
        bot = DiscordMusicBot()
        await bot.start()
        
    except Exception as error:
        logging.error(f"Failed to start application: {error}")
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())