"""
SafeSpeak — Messages Router
Handles text and image message sending with async ML analysis dispatch.
"""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from app.core.security import verify_firebase_token
from app.core.firebase import get_firestore_client, get_storage_bucket
from app.core.config import settings
from app.models.schemas import MessageRequest, MessageResponse, ImageMessageResponse
from app.services.inference import distilbert
from app.workers.tasks import analyze_text_message, analyze_image_safety
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/messages", tags=["messages"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024


@router.post("", response_model=MessageResponse, status_code=202)
@limiter.limit("60/minute")
async def send_message(
    request: Request,
    payload: MessageRequest,
    uid: str = Depends(verify_firebase_token),
):
    """
    Send a text message:
    1. Write to Firestore immediately
    2. Dispatch async DistilBERT classification (non-blocking)
    3. Return messageId immediately
    """
    db = get_firestore_client()

    # Verify user is a participant in this conversation
    convo_ref = db.collection("conversations").document(payload.conversationId)
    convo_doc = convo_ref.get()

    if not convo_doc.exists:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    convo_data = convo_doc.to_dict()
    if uid not in convo_data.get("participants", []):
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation.")

    # Create message document
    from google.cloud.firestore import SERVER_TIMESTAMP

    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    msg_ref = convo_ref.collection("messages").document(message_id)

    msg_data = {
        "senderId": uid,
        "type": "text",
        "content": payload.content,
        "timestamp": SERVER_TIMESTAMP,
        "flagged": False,
        "flagDetails": None,
        "imageBlurred": False,
    }

    msg_ref.set(msg_data)

    # Update conversation's lastMessage
    convo_ref.update({
        "lastMessage": {
            "content": payload.content[:100],
            "senderId": uid,
            "timestamp": SERVER_TIMESTAMP,
        }
    })

    # Dispatch async ML analysis
    analyze_text_message.delay(payload.conversationId, message_id, payload.content)

    logger.info("[Messages] Text message %s sent by %s", message_id, uid)
    return MessageResponse(messageId=message_id, status="processing")


@router.post("/image", response_model=ImageMessageResponse, status_code=202)
@limiter.limit("20/minute")
async def send_image_message(
    request: Request,
    conversationId: str = Form(...),
    file: UploadFile = File(...),
    uid: str = Depends(verify_firebase_token),
):
    """
    Upload and send an image message:
    1. Validate MIME type and size
    2. Upload to Firebase Storage (pending/ prefix)
    3. Write message to Firestore
    4. Dispatch async CNN safety check
    5. Return messageId + storageUrl
    """
    # Validate MIME type (server-side, not just extension)
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

    db = get_firestore_client()
    bucket = get_storage_bucket()

    # Verify conversation membership
    convo_ref = db.collection("conversations").document(conversationId)
    convo_doc = convo_ref.get()

    if not convo_doc.exists:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    if uid not in convo_doc.to_dict().get("participants", []):
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation.")

    # Upload to Firebase Storage
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    blob_path = f"images/pending/{uid}/{message_id}"
    blob = bucket.blob(blob_path)
    blob.upload_from_string(file_bytes, content_type=file.content_type)

    storage_url = blob.public_url

    # Write message to Firestore
    from google.cloud.firestore import SERVER_TIMESTAMP

    msg_ref = convo_ref.collection("messages").document(message_id)
    msg_ref.set({
        "senderId": uid,
        "type": "image",
        "content": storage_url,
        "timestamp": SERVER_TIMESTAMP,
        "flagged": False,
        "flagDetails": None,
        "imageBlurred": True,  # Blurred by default until CNN clears it
    })

    convo_ref.update({
        "lastMessage": {
            "content": "📷 Image",
            "senderId": uid,
            "timestamp": SERVER_TIMESTAMP,
        }
    })

    # Dispatch async CNN safety check
    analyze_image_safety.delay(conversationId, message_id, storage_url)

    logger.info("[Messages] Image message %s uploaded by %s", message_id, uid)
    return ImageMessageResponse(
        messageId=message_id,
        storageUrl=storage_url,
        status="pending_review",
    )
