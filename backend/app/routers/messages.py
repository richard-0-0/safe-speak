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
from app.models.schemas import MessageRequest, MessageResponse, ImageMessageResponse, ReadMessagesRequest, EditMessageRequest
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
        "readBy": [uid],
        "deleted": False,
        "edited": False,
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


@router.put("/read", status_code=200)
@limiter.limit("60/minute")
async def mark_messages_read(
    request: Request,
    payload: ReadMessagesRequest,
    uid: str = Depends(verify_firebase_token),
):
    """
    Mark messages as read by adding the user's UID to each message's readBy array.
    """
    db = get_firestore_client()
    convo_ref = db.collection("conversations").document(payload.conversationId)
    convo_doc = convo_ref.get()

    if not convo_doc.exists:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if uid not in convo_doc.to_dict().get("participants", []):
        raise HTTPException(status_code=403, detail="You are not a participant.")

    from google.cloud.firestore import ArrayUnion

    batch = db.batch()
    for msg_id in payload.messageIds[:100]:  # Limit batch size
        msg_ref = convo_ref.collection("messages").document(msg_id)
        batch.update(msg_ref, {"readBy": ArrayUnion([uid])})

    batch.commit()
    logger.info("[Messages] %s marked %d messages as read", uid, len(payload.messageIds))
    return {"status": "ok", "markedRead": len(payload.messageIds)}


@router.put("/{conversation_id}/{message_id}", status_code=200)
@limiter.limit("30/minute")
async def edit_message(
    request: Request,
    conversation_id: str,
    message_id: str,
    payload: EditMessageRequest,
    uid: str = Depends(verify_firebase_token),
):
    """
    Edit a text message. Saves original content, re-classifies the new text.
    Only the sender can edit their own messages.
    """
    db = get_firestore_client()
    convo_ref = db.collection("conversations").document(conversation_id)
    msg_ref = convo_ref.collection("messages").document(message_id)
    msg_doc = msg_ref.get()

    if not msg_doc.exists:
        raise HTTPException(status_code=404, detail="Message not found.")

    msg_data = msg_doc.to_dict()
    if msg_data.get("senderId") != uid:
        raise HTTPException(status_code=403, detail="You can only edit your own messages.")
    if msg_data.get("type") != "text":
        raise HTTPException(status_code=400, detail="Only text messages can be edited.")
    if msg_data.get("deleted"):
        raise HTTPException(status_code=400, detail="Cannot edit a deleted message.")

    from google.cloud.firestore import SERVER_TIMESTAMP

    # Save original content only on the first edit
    update_data = {
        "content": payload.content,
        "edited": True,
        "editedAt": SERVER_TIMESTAMP,
    }
    if not msg_data.get("edited"):
        update_data["originalContent"] = msg_data.get("content", "")

    msg_ref.update(update_data)

    # Re-classify the edited content
    analyze_text_message.delay(conversation_id, message_id, payload.content)

    logger.info("[Messages] Message %s edited by %s", message_id, uid)
    return {"status": "ok", "messageId": message_id}


@router.delete("/{conversation_id}/{message_id}", status_code=200)
@limiter.limit("30/minute")
async def delete_message(
    request: Request,
    conversation_id: str,
    message_id: str,
    uid: str = Depends(verify_firebase_token),
):
    """
    Delete a message.
    - Flagged messages: soft-delete (keep for reports)
    - Non-flagged messages: hard-delete from Firestore
    """
    db = get_firestore_client()
    convo_ref = db.collection("conversations").document(conversation_id)
    msg_ref = convo_ref.collection("messages").document(message_id)
    msg_doc = msg_ref.get()

    if not msg_doc.exists:
        raise HTTPException(status_code=404, detail="Message not found.")

    msg_data = msg_doc.to_dict()
    if msg_data.get("senderId") != uid:
        raise HTTPException(status_code=403, detail="You can only delete your own messages.")

    if msg_data.get("flagged"):
        # Soft-delete: keep content for SOS reports
        from google.cloud.firestore import SERVER_TIMESTAMP
        msg_ref.update({
            "deleted": True,
            "deletedAt": SERVER_TIMESTAMP,
            "deletedBy": uid,
        })
        logger.info("[Messages] Flagged message %s soft-deleted by %s", message_id, uid)
    else:
        # Hard-delete: remove completely
        msg_ref.delete()
        logger.info("[Messages] Message %s hard-deleted by %s", message_id, uid)

    return {"status": "ok", "messageId": message_id}
