# syntax=docker/dockerfile:1

FROM python:3.10-slim AS base

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# --- Builder stage: install dependencies in a venv ---
FROM base AS builder

# Install system dependencies required for pip and venv
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy only requirements.txt for dependency caching
COPY --link requirements.txt ./

# Create virtual environment and install dependencies
RUN python -m venv /app/.venv && \
    . /app/.venv/bin/activate && \
    pip install --upgrade pip && \
    --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# --- Final stage: copy app and run as non-root user ---
FROM base AS final

# Create a non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy application code (excluding .env, .git, etc. via .dockerignore)
COPY --link src/ ./src/

# Set permissions for the non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Expose the default port (can be overridden at runtime)
EXPOSE 5000

# Entrypoint
CMD ["python", "src/main.py"]
