# MoonTVPlus FPK - Dockerfile with Activation Layer
# Stage 1: Build MoonTVPlus from source
FROM node:24-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:24-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DOCKER_ENV=true
RUN pnpm run build
RUN pnpm deploy --filter=. --prod --legacy /tmp/prod-deps

# Stage 3: Runner with Activation Layer
FROM node:24-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache su-exec \
    && addgroup -g 1001 -S nodejs \
    && adduser -u 1001 -S nextjs -G nodejs

# Copy MoonTVPlus application
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DOCKER_ENV=true
ENV SQLITE_DB_PATH=/app/.data/moontv.db
ENV OFFLINE_DOWNLOAD_DIR=/data
ENV ACTIVATION_API_URL=https://9ay.kdns.fr

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/start.js ./start.js
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./server.js
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/tv-remote-hub.js ./src/lib/tv-remote-hub.js
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./ .next/static
COPY --from=builder --chown=nextjs:nodejs /tmp/prod-deps/node_modules ./node_modules

# Copy activation layer
COPY --chown=nextjs:nodejs activation/ ./activation/

# Create directories
RUN mkdir -p /app/.data /app/activation "$OFFLINE_DOWNLOAD_DIR" \
    && chown -R nextjs:nodejs /app/.data /app/activation "$OFFLINE_DOWNLOAD_DIR"

EXPOSE 3000

ENTRYPOINT ["node", "activation/start-with-activation.js"]
