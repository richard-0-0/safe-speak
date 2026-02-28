#!/bin/bash
# ── SafeSpeak Production Startup ──
# Runs FastAPI API server (with inline Celery tasks via task_always_eager).
# Used for Render.com free tier (single container, 512MB memory).

# Note: We do NOT start a separate Celery worker process here.
# The ML model is ~300MB, so running two processes would exceed 512MB.
# Instead, Celery tasks run synchronously inside the FastAPI process
# via task_always_eager=True (set in celery_app.py).

echo "[SafeSpeak] Starting FastAPI server (Celery tasks run inline)..."
exec python run.py
