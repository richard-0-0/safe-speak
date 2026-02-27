#!/bin/bash
# ── SafeSpeak Production Startup ──
# Runs both FastAPI API server and Celery worker in a single container.
# Used for Render.com free tier (single container deployment).

set -e

# Suppress Celery root warning
export C_FORCE_ROOT="true"

echo "[SafeSpeak] Starting Celery worker in background..."
# Using --pool=solo runs the worker in the same process to save memory
# This is critical for Render's 512MB free tier, as the ML model is ~300MB
celery -A app.workers.celery_app worker --loglevel=info --pool=solo &

echo "[SafeSpeak] Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
