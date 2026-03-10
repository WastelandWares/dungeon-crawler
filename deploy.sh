#!/bin/bash
# Deploy dungeon-crawler to turtles.wastelandwares.com
# Pulls from git, builds, and serves static artifacts.
# Usage: ./deploy.sh
set -e

SERVER="turtles.wastelandwares.com"
PORT=16161
REMOTE_DIR="~/dungeon-crawler"
SERVE_DIR="~/dungeon-crawler/dist"
REPO_URL="https://git.wastelandwares.com/tquick/dungeon-crawler.git"

echo "==> Deploying dungeon-crawler to $SERVER..."

# Ensure repo exists on server, pull latest
ssh $SERVER -p $PORT "
  if [ ! -d $REMOTE_DIR/.git ]; then
    echo '  Cloning repo...'
    git clone $REPO_URL $REMOTE_DIR
  else
    echo '  Pulling latest...'
    cd $REMOTE_DIR && git fetch origin && git reset --hard origin/main
  fi
"

# Install deps and build on server
echo "==> Building on server..."
ssh $SERVER -p $PORT "
  source ~/.nvm/nvm.sh
  cd $REMOTE_DIR
  npm ci --production=false
  npx vite build
"

# Restart http-server pointing at dist/
echo "==> Restarting http-server..."
ssh $SERVER -p $PORT "
  source ~/.nvm/nvm.sh
  pkill -f 'http-server.*2323' 2>/dev/null || true
  cd $SERVE_DIR
  nohup npx http-server -p 2323 -c-1 > ../server.log 2>&1 &
"

# Verify
echo "==> Verifying..."
sleep 2
STATUS=$(ssh $SERVER -p $PORT "curl -s -o /dev/null -w '%{http_code}' http://localhost:2323/")
if [ "$STATUS" = "200" ]; then
  echo "==> Deploy successful! (HTTP $STATUS)"
  echo "    Site: https://turtles.wastelandwares.com"
else
  echo "==> WARNING: Server returned HTTP $STATUS"
  echo "    Check logs: ssh $SERVER -p $PORT 'cat $REMOTE_DIR/server.log'"
fi
