"""
SafeSpeak — Celery Application Configuration
Uses Redis Cloud as the message broker and result backend.
"""
import os
from celery import Celery


def _ensure_ssl_params(url: str) -> str:
    """Append ssl_cert_reqs=CERT_NONE to rediss:// URLs if missing.
    Celery's Redis backend strictly requires this URL query parameter
    when using TLS connections (e.g. Upstash, Redis Cloud)."""
    if url and url.startswith("rediss://") and "ssl_cert_reqs" not in url:
        separator = "&" if "?" in url else "?"
        url += f"{separator}ssl_cert_reqs=CERT_NONE"
    return url


# Resolve broker URL: CELERY_BROKER_URL → REDIS_URL → localhost fallback
# Using `or` instead of os.getenv default to handle empty-string env vars
REDIS_URL = _ensure_ssl_params(
    os.getenv("CELERY_BROKER_URL") or os.getenv("REDIS_URL") or "redis://localhost:6379"
)

# Resolve result backend URL separately (may be a different env var)
RESULT_BACKEND = _ensure_ssl_params(
    os.getenv("CELERY_RESULT_BACKEND") or REDIS_URL
)

celery_app = Celery(
    "safespeak",
    broker=REDIS_URL,
    backend=RESULT_BACKEND,
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
    broker_connection_retry_on_startup=True,
)
