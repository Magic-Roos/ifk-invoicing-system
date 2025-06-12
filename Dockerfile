# Dockerfile for IFK Göteborg Orientering - Member Invoicing System

# This is a placeholder Dockerfile. It will be configured later for development and production.

# --- Backend Stage ---
# FROM node:alpine as backend
# WORKDIR /app/backend
# COPY backend/package*.json ./
# RUN npm install
# COPY backend/ .
# EXPOSE 3001

# --- Frontend Stage ---
# FROM node:alpine as frontend
# WORKDIR /app/frontend
# COPY frontend/package*.json ./
# RUN npm install
# COPY frontend/ .
# RUN npm run build

# --- Production Stage ---
# FROM nginx:alpine
# COPY --from=frontend /app/frontend/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf # You'll need to create an nginx.conf
# EXPOSE 80

# For now, just a simple placeholder
FROM alpine:latest
CMD echo "Dockerfile placeholder - to be configured"
