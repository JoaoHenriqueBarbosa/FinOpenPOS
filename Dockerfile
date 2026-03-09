FROM alpine:3.21 AS base
RUN apk add --no-cache nodejs npm nginx && npm i -g bun

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY apps/www/package.json ./apps/www/
COPY apps/docs/package.json ./apps/docs/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/fiscal/package.json ./packages/fiscal/
COPY packages/ui/package.json ./packages/ui/
RUN bun install --frozen-lockfile --ignore-scripts

FROM base AS build
WORKDIR /app
COPY --from=deps /app .
COPY . .

# Run postinstall scripts (fumadocs-mdx needs source files)
RUN cd apps/docs && bunx fumadocs-mdx

ENV BETTER_AUTH_SECRET=build-placeholder
ENV BETTER_AUTH_URL=http://localhost:3001

ARG NEXT_PUBLIC_DOCS_URL=http://localhost:3002
ARG NEXT_PUBLIC_API_DOCS_URL=http://localhost:3001/api/docs
ENV NEXT_PUBLIC_DOCS_URL=$NEXT_PUBLIC_DOCS_URL
ENV NEXT_PUBLIC_API_DOCS_URL=$NEXT_PUBLIC_API_DOCS_URL

# Build web with basePath=/app
RUN mkdir -p apps/web/data && cd apps/web && BASE_PATH=/app bun run --bun next build

# Build www (no basePath, serves at /)
RUN cd apps/www && bun run --bun next build

# Build docs with basePath=/docs
RUN cd apps/docs && BASE_PATH=/docs bun run --bun next build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/www/node_modules ./apps/www/node_modules
COPY --from=deps /app/apps/docs/node_modules ./apps/docs/node_modules

# Copy built web app
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/package.json ./apps/web/
COPY --from=build /app/apps/web/next.config.mjs ./apps/web/
COPY --from=build /app/apps/web/drizzle.config.ts ./apps/web/
COPY --from=build /app/apps/web/scripts ./apps/web/scripts
COPY --from=build /app/apps/web/src ./apps/web/src

# Copy built www app
COPY --from=build /app/apps/www/.next ./apps/www/.next
COPY --from=build /app/apps/www/package.json ./apps/www/
COPY --from=build /app/apps/www/next.config.ts ./apps/www/

# Copy built docs app
COPY --from=build /app/apps/docs/.next ./apps/docs/.next
COPY --from=build /app/apps/docs/package.json ./apps/docs/
COPY --from=build /app/apps/docs/next.config.mjs ./apps/docs/

# Copy packages source (needed by drizzle-kit at runtime)
COPY --from=build /app/packages ./packages

COPY --from=build /app/package.json ./

# Nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3111
CMD ["/docker-entrypoint.sh"]
