FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace manifests for layer caching
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json    ./packages/web/
COPY packages/mcp/package.json    ./packages/mcp/
COPY packages/mail-mcp/package.json ./packages/mail-mcp/
RUN npm install

# Build shared (server depends on it)
FROM base AS shared-builder
COPY packages/shared ./packages/shared
RUN npm run build --workspace=packages/shared

# Build server, then prune to prod-only deps
FROM shared-builder AS server-builder
COPY packages/server ./packages/server
RUN npm run build --workspace=packages/server && npm prune --omit=dev

# Build web SPA (served by Nginx, not Express)
FROM base AS web-builder
COPY packages/shared ./packages/shared
COPY packages/web    ./packages/web
RUN npm run build --workspace=packages/shared && npm run build --workspace=packages/web

# Build MCP HTTP server
FROM shared-builder AS mcp-builder
COPY packages/mcp ./packages/mcp
RUN npm run build --workspace=packages/mcp && npm prune --omit=dev

# MCP HTTP image
FROM node:20-alpine AS mcp
WORKDIR /app
COPY --from=mcp-builder /app/node_modules ./node_modules
COPY --from=mcp-builder /app/packages/mcp/dist ./dist
EXPOSE 3002
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:3002/health || exit 1
CMD ["node", "dist/index.js"]

# Build mail MCP HTTP server (no @notes-world/shared dependency, so builds from base)
FROM base AS mail-mcp-builder
COPY packages/mail-mcp ./packages/mail-mcp
RUN npm run build --workspace=packages/mail-mcp && npm prune --omit=dev

# Mail MCP HTTP image
FROM node:20-alpine AS mail-mcp
WORKDIR /app
COPY --from=mail-mcp-builder /app/node_modules ./node_modules
COPY --from=mail-mcp-builder /app/packages/mail-mcp/dist ./dist
EXPOSE 3003
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:3003/health || exit 1
CMD ["node", "dist/index.js"]

# Production API image — pure API server, no static files
FROM node:20-alpine AS production
RUN apk add --no-cache curl
WORKDIR /app

# node_modules symlink @notes-world/shared → ../../packages/shared, so copy both
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=server-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=server-builder /app/packages/server/dist ./dist
COPY packages/server/src/db/migrations ./dist/db/migrations

EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
