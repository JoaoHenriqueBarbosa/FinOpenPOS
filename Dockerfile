FROM alpine:3.21 AS base
RUN apk add --no-cache nodejs npm && npm i -g bun

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/fiscal/package.json ./packages/fiscal/
COPY packages/ui/package.json ./packages/ui/
RUN bun install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app .
COPY . .

ENV BETTER_AUTH_SECRET=build-placeholder
ENV BETTER_AUTH_URL=http://localhost:3000

RUN mkdir -p apps/web/data && cd apps/web && bun run --bun next build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy full node_modules tree (root + workspace hoisted)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy built app
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/package.json ./apps/web/
COPY --from=build /app/apps/web/next.config.mjs ./apps/web/
COPY --from=build /app/apps/web/drizzle.config.ts ./apps/web/
COPY --from=build /app/apps/web/scripts ./apps/web/scripts
COPY --from=build /app/apps/web/src ./apps/web/src
COPY --from=build /app/package.json ./

WORKDIR /app/apps/web
EXPOSE 3111
CMD ["sh", "-c", "bun scripts/ensure-db.ts && bunx drizzle-kit push && bun next start"]
