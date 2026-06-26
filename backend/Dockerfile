# ──────────────────────────────────────────────
# TaskSphere — Backend Dockerfile
# Django + Daphne ASGI server
# ──────────────────────────────────────────────

FROM python:3.11-slim

# Keeps Python from generating .pyc files and
# ensures stdout/stderr are unbuffered for logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies (curl is needed for the healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer-cache friendly)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

EXPOSE 8000

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "app.asgi:application"]
