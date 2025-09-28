# Stage 1: Build the React app
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the app with Nginx (and make it dynamic)
FROM nginx:stable-alpine

# Install 'gettext' which provides 'envsubst' to substitute environment variables
RUN apk add --no-cache gettext

# Copy the build output
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the Nginx config TEMPLATE (we'll generate the final one on startup)
COPY nginx.conf.template /etc/nginx/conf.d/nginx.conf.template

# Copy the startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080 # Expose a default port, Railway will override this
CMD ["/start.sh"]