# ── Flask Backend ────────────────────────────────────────────────────────────
FROM python:3.12-slim

# System deps:
#   gcc / pkg-config        → cryptography / PyMySQL native extensions
#   libmariadb-dev-compat   → mysql client headers
#   libgl1 / libglib2.0-0   → opencv-headless runtime
#   libgomp1                → PyTorch OpenMP (ultralytics)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libmariadb-dev-compat \
        pkg-config \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (cached layer — only rebuilds when requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Create all necessary runtime directories
RUN mkdir -p \
    uploads/snapshots \
    uploads/images \
    training_runs/jobs \
    training_runs/datasets \
    training_runs/exports

EXPOSE 5000

# Gunicorn with 1 worker + 8 threads:
#   - 1 worker is REQUIRED so in-memory training state (cancel flags, auto-label jobs)
#     is shared across all requests in the same process
#   - 8 threads allow concurrent HTTP requests while training runs in background
#   - timeout 300 covers long-running annotation save / inference / export requests
#   - Training itself runs in a daemon thread (not a gunicorn worker), so it is
#     unaffected by the worker count
CMD ["gunicorn", "run:app", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "1", \
     "--threads", "8", \
     "--timeout", "300", \
     "--log-level", "info", \
     "--access-logfile", "-"]
