# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite reads VITE_ environment variables at build time. 
# Make sure to configure environment variables in your deployment pipeline (Easypanel).
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy default nginx configuration if customized routing is needed, 
# otherwise default will serve index.html and static assets correctly.
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
