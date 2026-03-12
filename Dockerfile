FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json ./
COPY src/server/package.json ./src/server/
COPY src/client/package.json ./src/client/
RUN npm install

# Build client
FROM base AS client-builder
COPY src/client ./src/client
RUN npm run build --workspace=src/client

# Build server
FROM base AS server-builder
COPY src/server ./src/server
RUN npm run build --workspace=src/server

# Production image
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=server-builder /app/src/server/dist ./dist
COPY --from=server-builder /app/src/server/package.json ./
COPY --from=client-builder /app/src/client/dist ./public
# Copy SQL migrations into the image (must match __dirname/migrations in dist/db/)
COPY src/server/src/db/migrations ./dist/db/migrations

RUN npm install --omit=dev

EXPOSE 3001
CMD ["node", "dist/server.js"]
