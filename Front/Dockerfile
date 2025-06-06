# syntax=docker/dockerfile:1

# --- Stage 1: Build static assets if needed (not used here, pure static frontend) ---
# Skipped: No build step, just static files (index.html, app.js, styles.css)

# --- Stage 2: Serve static files with a minimal web server ---
FROM nginx:alpine AS final

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy frontend static files
COPY --link index.html app.js styles.css /usr/share/nginx/html/

# Security: run as non-root user (nginx image uses user 101 by default)
# (nginx:alpine already runs as non-root by default)

# Expose port 80
EXPOSE 80

# No CMD needed, nginx base image already starts nginx

# --- Notes ---
# - Do NOT copy .env, .git, or any secret/config files (see .dockerignore)
# - This image serves the static frontend at http://localhost:80
# - For local dev, you may want to mount the Front/ dir as a volume
# - For production, serve behind a reverse proxy if needed
