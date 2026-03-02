"""
SafeSpeak — JWT Security Middleware
Verifies Firebase ID tokens on every protected endpoint.
"""
import logging
import firebase_admin
from firebase_admin import auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer()


async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Security(security_scheme),
) -> str:
    """
    FastAPI dependency that extracts and verifies a Firebase ID token
    from the Authorization: Bearer <token> header.

    Returns the user's Firebase UID on success.
    Raises HTTP 401 on invalid or expired tokens.
    """
    try:
        decoded = auth.verify_id_token(credentials.credentials)
        return decoded["uid"]
    except firebase_admin.exceptions.FirebaseError as exc:
        logger.warning("[Auth] Firebase token verification failed: %s", exc)
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token. Please sign in again.",
        )
    except Exception as exc:
        logger.warning("[Auth] Unexpected token verification error: %s", exc)
        raise HTTPException(
            status_code=401,
            detail="Authentication failed. Please sign in again.",
        )
