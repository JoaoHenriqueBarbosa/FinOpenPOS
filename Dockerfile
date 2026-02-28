FROM alpine:3.21 AS deps
RUN apk add --no-cache nodejs npm && npm i -g bun
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM alpine:3.21 AS build
RUN apk add --no-cache nodejs npm && npm i -g bun
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV BETTER_AUTH_SECRET=build-placeholder
ENV BETTER_AUTH_URL=http://localhost:3000

RUN bun run db:ensure && bun run db:push && bun run --bun next build

FROM alpine:3.21 AS runtime
RUN apk add --no-cache nodejs
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/data ./data

EXPOSE 3000
CMD ["node", "server.js"]
