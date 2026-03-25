# Dockerfile for LUME by Mark
# Multi-stage build: Node.js (frontend) + Python (backend)
# Same proven pattern as ADU media

# =============================================================================
# Stage 1: Build Frontend
# =============================================================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy package files first for better layer caching
COPY frontend/package.json ./
COPY frontend/package-lock.json* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy frontend source
COPY frontend/ ./

# Build the React app (Vite outputs to dist/)
RUN npm run build

# =============================================================================
# Stage 2: Python Backend with Frontend Assets
# =============================================================================
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create non-root user
RUN useradd -m -r appuser && chown -R appuser:appuser /app
USER appuser

# Expose port (Railway sets PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start the application
CMD ["python", "backend/main.py"]
