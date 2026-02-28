"""
SafeSpeak — Celery Application Configuration
Uses Redis Cloud as the message broker and result backend.
"""
import os
import ssl
from celery import Celery

REDIS_URL = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://localhost:6379"))

celery_app = Celery(
    "safespeak",
    broker=REDIS_URL,
    backend=os.getenv("CELERY_RESULT_BACKEND", REDIS_URL),
    include=["app.workers.tasks"],
)

# ── Upstash / managed Redis requires SSL config when using rediss:// ──
is_ssl = REDIS_URL.startswith("rediss://")

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
    broker_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE} if is_ssl else None,
    redis_backend_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE} if is_ssl else None,
)
