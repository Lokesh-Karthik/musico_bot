"""
Logging utilities for the Discord Music Bot
"""

import logging
import sys
from datetime import datetime

def setup_logger():
    """Setup logging configuration"""
    # Create formatter
    formatter = logging.Formatter(
        '[%(levelname)s] %(asctime)s - %(name)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Reduce discord.py logging level
    logging.getLogger('discord').setLevel(logging.WARNING)
    logging.getLogger('discord.http').setLevel(logging.WARNING)
    
    # Reduce yt-dlp logging level
    logging.getLogger('yt_dlp').setLevel(logging.WARNING)

def get_logger(name):
    """Get a logger instance"""
    return logging.getLogger(name)

class Logger:
    """Logger class for compatibility with original code"""
    
    @staticmethod
    def info(message, *args):
        logging.info(message, *args)
    
    @staticmethod
    def error(message, *args):
        logging.error(message, *args)
    
    @staticmethod
    def warn(message, *args):
        logging.warning(message, *args)
    
    @staticmethod
    def debug(message, *args):
        logging.debug(message, *args)