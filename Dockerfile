# ==============================================================================
# Multi-stage Dockerfile for Doctor Leave @ LINE (Bangkok Hospital Siriroj)
# ==============================================================================

# --- Stage 1: Build Frontend (Vite) ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build production bundle
COPY . .
RUN npm run build

# --- Stage 2: Production Server (Node.js & Express) ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled frontend and backend source
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY scripts ./scripts
COPY public ./public

# Ensure upload directory and persistent store directory exist
RUN mkdir -p uploads server/data && chown -R node:node /app

# Run as non-root user for hospital security compliance
USER node

EXPOSE 5000

# Healthcheck testing the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 5000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
