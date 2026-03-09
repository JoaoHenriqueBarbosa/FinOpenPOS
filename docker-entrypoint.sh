#!/bin/sh
set -e

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

# Start nginx in foreground
nginx -g 'daemon off;'
