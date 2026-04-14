# ── Stage 1: Build Vite app ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Accept API base URL as build argument
# Empty string → relative URLs → nginx proxy handles /api/ routing
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json ./
# Install all deps + explicitly add react/react-dom (listed as peerDeps only)
RUN npm install --legacy-peer-deps \
    && npm install react@18.3.1 react-dom@18.3.1 --legacy-peer-deps

COPY . .
RUN npm run build

# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
