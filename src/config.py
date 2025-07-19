"""
Configuration module for Discord Music Bot
"""

import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

class Config:
    """Configuration class containing all bot settings"""
    
    # Discord settings
    DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
    CLIENT_ID = os.getenv('CLIENT_ID')
    
    # Spotify settings
    SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
    SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
    
    # Bot settings
    PREFIX = os.getenv('PREFIX', '!')
    
    # YouTube settings
    YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')

def validate_config():
    """Validate required configuration values"""
    required = ['DISCORD_TOKEN', 'CLIENT_ID']
    missing = [key for key in required if not getattr(Config, key)]
    
    if missing:
        logging.error(f"Missing required environment variables: {', '.join(missing)}")
        logging.error("Please copy .env.example to .env and fill in the required values")
        exit(1)
    
    if not Config.SPOTIFY_CLIENT_ID or not Config.SPOTIFY_CLIENT_SECRET:
        logging.warning("Spotify credentials not provided. Spotify playlist support will be disabled.")
    
    if not Config.YOUTUBE_API_KEY:
        logging.warning("YouTube API key not provided. Search and playlist features will be limited.")

# Global config instance
config = Config()