"""
SafeSpeak — Celery Application Configuration
Uses Redis Cloud as the message broker and result backend.
"""
import os
import ssl
from celery import Celery

REDIS_URL = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://localhost:6379"))

# ── Upstash / managed Redis requires SSL config when using rediss:// ──
if REDIS_URL.startswith("rediss://") and "?" not in REDIS_URL:
    REDIS_URL += "?ssl_cert_reqs=CERT_NONE"

celery_app = Celery(
    "safespeak",
    broker=REDIS_URL,
    backend=os.getenv("CELERY_RESULT_BACKEND", REDIS_URL),
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
)
