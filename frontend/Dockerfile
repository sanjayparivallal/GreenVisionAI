# ---- Stage 1: Build Frontend Assets ----
FROM node:20-alpine AS build

WORKDIR /app

# Define frontend build arguments & environment variables
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL} \
    NODE_ENV=production

# Copy dependency manifests first for layer caching
COPY package.json package-lock.json* bun.lock* ./
RUN npm install

# Copy application source and build production bundle
COPY . .
RUN npm run build

# ---- Stage 2: Production Nginx Server ----
FROM nginx:alpine

# Copy built artifacts to Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with API reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
