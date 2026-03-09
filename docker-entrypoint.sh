#!/bin/sh
set -e

# Start nginx first (so port 80 responds immediately)
nginx

# Start web app (with db setup)
cd /app/apps/web
mkdir -p data
bun scripts/ensure-db.ts && bunx drizzle-kit push
BASE_PATH=/app bun next start --port 3001 &

# Start www (landing page)
cd /app/apps/www
bun next start --port 3003 &

# Start docs
cd /app/apps/docs
BASE_PATH=/docs bun next start --port 3002 &

# Wait for any process to exit
wait
