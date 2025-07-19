#!/usr/bin/env python3
"""
Installation script for Discord Music Bot
"""

import subprocess
import sys
import os

def run_command(command):
    """Run a command and return success status"""
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {command}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {command}")
        print(f"Error: {e.stderr}")
        return False

def main():
    """Main installation function"""
    print("🚀 Installing Discord Music Bot dependencies...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required!")
        sys.exit(1)
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    
    # Upgrade pip first
    print("\n📦 Upgrading pip...")
    run_command(f"{sys.executable} -m pip install --upgrade pip")
    
    # Install dependencies one by one
    dependencies = [
        "discord.py[voice]==2.3.2",
        "yt-dlp==2023.12.30", 
        "spotipy==2.22.1",
        "python-dotenv==1.0.0",
        "PyNaCl==1.5.0",
        "aiohttp==3.9.1"
    ]
    
    print("\n📦 Installing dependencies...")
    failed_packages = []
    
    for dep in dependencies:
        print(f"\nInstalling {dep}...")
        if not run_command(f"{sys.executable} -m pip install {dep}"):
            failed_packages.append(dep)
    
    # Try alternative installation for failed packages
    if failed_packages:
        print(f"\n⚠️  Retrying failed packages with --no-cache-dir...")
        for dep in failed_packages:
            print(f"Retrying {dep}...")
            run_command(f"{sys.executable} -m pip install --no-cache-dir {dep}")
    
    print("\n✅ Installation complete!")
    print("\n📋 Next steps:")
    print("1. Copy .env.example to .env")
    print("2. Fill in your Discord bot token and other credentials")
    print("3. Run: python main.py")

if __name__ == "__main__":
    main()