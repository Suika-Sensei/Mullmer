# Multi-stage build: build frontend, then run production server
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (with dev deps for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built assets and server code
COPY --from=builder /app/dist ./dist
COPY server ./server

# Optional static/public if server uses it directly
COPY public ./public
COPY index.html ./index.html
COPY vite.config.js ./vite.config.js

EXPOSE 3001
CMD ["npm", "start"]
