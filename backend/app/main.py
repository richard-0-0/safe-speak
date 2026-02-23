"""
SafeSpeak — FastAPI Application Entry Point
Initializes the API server with lifespan management, middleware,
rate limiting, CORS, router registration, and health check.
"""
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.firebase import init_firebase
from app.services.inference import distilbert

from app.routers import auth, messages, reports, chatbot

# ── Logging Configuration ────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("safespeak")

# ── Sentry Integration ───────────────────────────────────────────────
if settings.SENTRY_DSN:
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=0.1,
            environment=settings.ENVIRONMENT,
        )
        logger.info("[Sentry] Error tracking initialized.")
    except Exception as exc:
        logger.warning("[Sentry] Failed to initialize: %s", exc)


# ── Application Lifespan ─────────────────────────────────────────────

START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup/shutdown lifecycle.
    - Initializes Firebase Admin SDK
    - Loads DistilBERT ONNX model into memory
    """
    logger.info("[SafeSpeak] Starting application...")

    # Initialize Firebase Admin SDK
    try:
        init_firebase()
        logger.info("[SafeSpeak] Firebase initialized.")
    except Exception as exc:
        logger.warning("[SafeSpeak] Firebase init skipped (dev mode?): %s", exc)

    # Load DistilBERT model into memory
    try:
        distilbert.initialize()
        logger.info("[SafeSpeak] DistilBERT model loaded.")
    except Exception as exc:
        logger.warning("[SafeSpeak] Model loading skipped (no model files?): %s", exc)

    yield

    logger.info("[SafeSpeak] Application shutting down.")


# ── FastAPI Application ──────────────────────────────────────────────

app = FastAPI(
    title="SafeSpeak API",
    description="Real-time messaging with AI-powered hate speech detection",
    version="2.0.0",
    lifespan=lifespan,
)

# ── Rate Limiting ────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS Middleware ──────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ─────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(messages.router)
app.include_router(reports.router)
app.include_router(chatbot.router)


# ── Health Check Endpoint ────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """
    Health check endpoint for load balancer probes and cron pings.
    Returns service status and whether the ML model is loaded.
    """
    return JSONResponse({
        "status": "ok",
        "uptime_seconds": round(time.time() - START_TIME),
        "model_loaded": distilbert._initialized,
        "version": "2.0.0",
    })


# ── Global Exception Handler ────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler to return friendly error messages."""
    logger.error("[SafeSpeak] Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Something went wrong on our end. Please try again later.",
            "error_type": type(exc).__name__,
        },
    )
