#!/usr/bin/env python3
"""
Setup script for Discord Music Bot
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="discord-music-bot",
    version="1.0.0",
    author="Discord Music Bot",
    description="A feature-rich Discord music bot with YouTube and Spotify support",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "discord.py[voice]>=2.3.0",
        "yt-dlp>=2023.12.30",
        "spotipy>=2.22.1",
        "python-dotenv>=1.0.0",
        "PyNaCl>=1.5.0",
        "aiohttp>=3.9.1",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "black>=22.0.0",
            "flake8>=4.0.0",
        ],
    },
)