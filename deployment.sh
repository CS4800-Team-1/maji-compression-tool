#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Configuration
APP_DIR="/Users/jamessalac/Downloads/SchoolWork/cs4800/team_proj/maji-compression-tool"
SCREEN_NAME="tinyvid"

cd $APP_DIR
echo "📂 Changed to directory: $APP_DIR"

echo "📥 Pulling latest code from GitHub..."
git pull origin main

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building application..."
npm run build

echo "♻️  Restarting application..."

# Kill existing screen session if it exists
if screen -list | grep -q $SCREEN_NAME; then
  echo "Stopping existing screen session..."
  screen -S $SCREEN_NAME -X quit
  PID=$(pgrep -f next-server)
  kill "$PID"
fi

# Start new screen session in detached mode
echo "Starting new screen session..."
screen -dmS $SCREEN_NAME npm start

# Wait a moment for it to start
sleep 2

# Check if it's running
if screen -list | grep -q $SCREEN_NAME; then
  echo "✅ Screen session started successfully!"
  screen -list
else
  echo "❌ Failed to start screen session"
  exit 1
fi

echo "✅ Deployment completed successfully!"
echo "🌐 Site should be live at https://tinyvid.site"
echo "💡 To view logs: screen -r $SCREEN_NAME"
echo "💡 To detach: Press Ctrl+A then D"