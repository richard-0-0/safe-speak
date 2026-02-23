"""
SafeSpeak — Application Configuration
Loads all environment variables via pydantic-settings.
"""
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── Firebase ──────────────────────────────────────────
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_STORAGE_BUCKET: str = ""

    # ── Redis ─────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"

    # ── LLM APIs ──────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # ── ML Model Paths ────────────────────────────────────
    DISTILBERT_MODEL_DIR: str = "./ml_models/distilbert"
    CNN_ONNX_PATH: str = "./ml_models/efficientnet/model.onnx"

    # ── App Config ────────────────────────────────────────
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173"
    HATE_SPEECH_CONFIDENCE_THRESHOLD: float = 0.85
    MAX_IMAGE_SIZE_MB: int = 10
    REPORT_PDF_EXPIRY_HOURS: int = 24

    # ── Celery ────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379"

    # ── Sentry ────────────────────────────────────────────
    SENTRY_DSN: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
