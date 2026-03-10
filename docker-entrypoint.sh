#!/bin/sh
set -e

# Start nginx first (so port 3111 responds immediately)
nginx

# Start web app (with db setup)
cd /app/apps/web
mkdir -p data
bun scripts/ensure-db.ts && bunx drizzle-kit push
BASE_PATH=/app bun next start --port 3001 &

# Start docs (serves landing page + documentation)
cd /app/apps/docs
bun next start --port 3002 &

# Wait for any process to exit
wait
