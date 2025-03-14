#!/bin/bash
# This is mostly for running the app through pm2 or other process managers (Run it directly first to authorize with the ytmdesktop companion server)

# Download all dependencies (skipped if already done) | Skipping install if node_modules exists for faster startup
if [ ! -d "node_modules" ]; then
    npm install
fi

npx tsx ./src/index.ts