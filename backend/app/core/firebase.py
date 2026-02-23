"""
SafeSpeak — Firebase Admin SDK Initialization
Provides Firestore client and Storage bucket access.
"""
import logging
import firebase_admin
from firebase_admin import credentials, firestore, storage
from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_app = None
_firestore_client = None
_storage_bucket = None


def init_firebase() -> None:
    """Initialize Firebase Admin SDK with service account credentials."""
    global _firebase_app

    if _firebase_app is not None:
        return

    try:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "token_uri": "https://oauth2.googleapis.com/token",
        })

        _firebase_app = firebase_admin.initialize_app(cred, {
            "storageBucket": f"{settings.FIREBASE_PROJECT_ID}.appspot.com",
        })

        logger.info("[Firebase] Admin SDK initialized for project: %s", settings.FIREBASE_PROJECT_ID)

    except Exception as exc:
        logger.error("[Firebase] Failed to initialize: %s", exc)
        raise


def get_firestore_client():
    """Return the Firestore client, initializing Firebase if needed."""
    global _firestore_client

    if _firestore_client is None:
        init_firebase()
        _firestore_client = firestore.client()

    return _firestore_client


def get_storage_bucket():
    """Return the Firebase Storage bucket, initializing Firebase if needed."""
    global _storage_bucket

    if _storage_bucket is None:
        init_firebase()
        _storage_bucket = storage.bucket()

    return _storage_bucket
