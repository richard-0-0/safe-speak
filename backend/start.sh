#!/bin/bash
# ── SafeSpeak Production Startup ──
# Runs both FastAPI API server and Celery worker in a single container.
# Used for Render.com free tier (single container deployment).

set -e

echo "[SafeSpeak] Starting Celery worker in background..."
celery -A app.workers.celery_app worker --loglevel=info --concurrency=2 &

echo "[SafeSpeak] Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
