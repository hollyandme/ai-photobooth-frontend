#!/bin/sh

# Substitute the PORT variable into our Nginx config template
# and output it to the final Nginx config file.
envsubst '${PORT}' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Start Nginx in the foreground
nginx -g 'daemon off;'