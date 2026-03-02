"""
SafeSpeak — Chatbot Router
Handles OCR + DistilBERT analysis of screenshot uploads
and LLM-backed follow-up conversation.
"""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from app.core.security import verify_firebase_token
from app.core.config import settings
from app.models.schemas import ChatbotAnalyzeResponse, ChatbotMessageRequest, ChatbotMessageResponse, FlagDetails
from app.services.ocr import extract_text
from app.services.inference import distilbert
from app.services.llm import generate_chatbot_response
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024

# In-memory session store (per-process, ephemeral)
# Each session stores up to 10 turns of conversation history
_sessions: dict[str, list[dict]] = {}
MAX_SESSION_TURNS = 10


@router.post("/analyze", response_model=ChatbotAnalyzeResponse)
@limiter.limit("30/minute")
async def analyze_screenshot(
    request: Request,
    file: UploadFile = File(...),
    sessionId: str = Form(default=""),
    uid: str = Depends(verify_firebase_token),
):
    """
    Accept a screenshot, extract text via OCR, classify with DistilBERT,
    and generate a contextual chatbot response.

    Pipeline: Upload → OCR → DistilBERT → LLM Response
    """
    # Validate MIME type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format: {file.content_type}. Allowed: JPEG, PNG, WEBP",
        )

    # Read and validate size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Image too large. Maximum size: {settings.MAX_IMAGE_SIZE_MB}MB",
        )

    # ── 1. Extract text with OCR ─────────────────────────────────
    ocr_result = extract_text(file_bytes)

    if not ocr_result["text"].strip():
        raise HTTPException(
            status_code=422,
            detail="Could not extract any text from this image. Please try a clearer screenshot.",
        )

    # ── 2. Classify extracted text ───────────────────────────────
    classification = distilbert.predict(ocr_result["text"])

    # ── 3. Generate chatbot response ─────────────────────────────
    session_id = sessionId or f"sess_{uuid.uuid4().hex[:12]}"

    # Initialize or retrieve session
    if session_id not in _sessions:
        _sessions[session_id] = []

    session_history = _sessions[session_id]

    chatbot_response = await generate_chatbot_response(
        extracted_text=ocr_result["text"],
        classification=classification,
        session_history=session_history,
    )

    # Add to session history
    session_history.append({
        "role": "user",
        "type": "image_analysis",
        "extractedText": ocr_result["text"],
        "classification": classification,
    })
    session_history.append({
        "role": "assistant",
        "content": chatbot_response,
    })

    # Trim session to max turns
    if len(session_history) > MAX_SESSION_TURNS * 2:
        _sessions[session_id] = session_history[-(MAX_SESSION_TURNS * 2):]

    low_quality_warning = ""
    if ocr_result["low_quality"]:
        low_quality_warning = "\n\n⚠️ Low image quality detected — OCR results may be inaccurate."

    logger.info(
        "[Chatbot] Screenshot analyzed: %s (%.2f) — OCR confidence: %.1f%%",
        classification["label"],
        classification["confidence"],
        ocr_result["avg_ocr_confidence"],
    )

    return ChatbotAnalyzeResponse(
        extractedText=ocr_result["text"],
        classification=FlagDetails(
            label=classification["label"],
            confidence=classification["confidence"],
            processedAt=datetime.now(timezone.utc).isoformat(),
        ),
        chatbotResponse=chatbot_response + low_quality_warning,
        sessionId=session_id,
    )


@router.post("/message", response_model=ChatbotMessageResponse)
@limiter.limit("30/minute")
async def chatbot_message(
    request: Request,
    payload: ChatbotMessageRequest,
    uid: str = Depends(verify_firebase_token),
):
    """
    Handle a follow-up text message in the chatbot session.
    Uses LLM to respond with context from the session history.
    """
    session_id = payload.sessionId
    session_history = _sessions.get(session_id, [])

    if not session_history:
        logger.info("[Chatbot] No session found for %s, creating new context.", session_id)

    # Generate LLM response using session context
    chatbot_response = await generate_chatbot_response(
        extracted_text="",
        classification={},
        user_message=payload.message,
        session_history=session_history,
    )

    # Update session history
    session_history.append({"role": "user", "content": payload.message})
    session_history.append({"role": "assistant", "content": chatbot_response})
    _sessions[session_id] = session_history

    # Trim to max turns
    if len(session_history) > MAX_SESSION_TURNS * 2:
        _sessions[session_id] = session_history[-(MAX_SESSION_TURNS * 2):]

    logger.info("[Chatbot] Follow-up message in session %s", session_id)
    return ChatbotMessageResponse(response=chatbot_response, sessionId=session_id)
