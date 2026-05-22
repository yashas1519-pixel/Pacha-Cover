# ============================================================
# Dockerfile — Pacha Cover (Frontend + Backend)
# Multi-stage build optimized for Google Cloud Run
# ============================================================

# ── Stage 1: Frontend Builder ──────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /build-frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit
COPY frontend/ .
RUN npm run build

# ── Stage 2: Backend Dependencies ──────────────────────────────────────────────
FROM python:3.12-slim AS backend-builder
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /build-backend
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# ── Stage 3: Production Runtime ────────────────────────────────────────────────
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8080

WORKDIR /app

# Copy virtualenv from backend-builder
COPY --from=backend-builder /opt/venv /opt/venv

# Copy backend source
COPY app/ ./app/
COPY firestore.rules ./
COPY firestore.indexes.json ./

# Copy compiled frontend → 'static' directory (served by FastAPI)
COPY --from=frontend-builder /build-frontend/dist ./static

# Service account key is mounted via Secret Manager in production
# For local Docker testing, uncomment the line below:
# COPY serviceAccountKey.json .

EXPOSE 8080

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Cloud Run sets PORT env var automatically
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4"]
