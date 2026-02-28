FROM alpine:3.21 AS base
RUN apk add --no-cache nodejs npm && npm i -g bun

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV BETTER_AUTH_SECRET=build-placeholder
ENV BETTER_AUTH_URL=http://localhost:3000

RUN mkdir -p data && bun run --bun next build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./
COPY --from=build /app/next.config.mjs ./
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src

EXPOSE 3000
CMD ["sh", "-c", "bun scripts/ensure-db.ts && bun drizzle-kit push && bun next start"]
