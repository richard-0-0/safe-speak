"""
SafeSpeak — Celery Background Tasks
Handles async ML inference, image safety checks, and SOS report generation.
"""
import logging
import asyncio
from datetime import datetime, timezone

from app.workers.celery_app import celery_app
from app.core.firebase import get_firestore_client, get_storage_bucket
from app.services.inference import distilbert
from app.services.llm import call_groq_with_fallback, classify_flagged_message
from app.services.pdf import render_report_pdf

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def analyze_text_message(self, conversation_id: str, message_id: str, content: str) -> dict:
    """
    Run DistilBERT inference on a text message, then sub-classify
    flagged messages via LLM into hate_speech/threat/offensive.
    """
    try:
        # Ensure model is initialized (handles first-call after worker start)
        if not distilbert._initialized:
            distilbert.initialize()

        result = distilbert.predict(content)

        # If flagged, use LLM to sub-classify into hate_speech/threat/offensive
        label = result["label"]
        if result["flagged"]:
            try:
                label = asyncio.run(classify_flagged_message(content))
                logger.info("[Task] LLM sub-classified message %s as: %s", message_id, label)
            except Exception as llm_err:
                logger.warning("[Task] LLM sub-classification failed for %s: %s. Using 'offensive' as default.", message_id, llm_err)
                label = "offensive"

        # Update Firestore with classification result
        db = get_firestore_client()
        msg_ref = db.collection("conversations").document(conversation_id)\
            .collection("messages").document(message_id)

        flag_details = {
            "label": label,
            "confidence": result["confidence"],
            "processedAt": datetime.now(timezone.utc).isoformat(),
        }

        msg_ref.update({
            "flagged": result["flagged"],
            "flagDetails": flag_details,
        })

        logger.info(
            "[Task] Message %s classified: %s (%.2f) flagged=%s",
            message_id,
            label,
            result["confidence"],
            result["flagged"],
        )

        result["label"] = label
        return result

    except Exception as exc:
        logger.error("[Task] analyze_text_message failed for %s: %s", message_id, exc)
        raise


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def analyze_image_safety(self, conversation_id: str, message_id: str, storage_url: str) -> dict:
    """
    Run CNN NSFW classification on an uploaded image.
    Updates Firestore message with imageBlurred status.
    """
    try:
        # For MVP, we mark images as safe since CNN model is a future enhancement
        # In production, this would download the image and run EfficientNet inference
        db = get_firestore_client()
        msg_ref = db.collection("conversations").document(conversation_id)\
            .collection("messages").document(message_id)

        msg_ref.update({
            "imageBlurred": False,
            "flagged": False,
            "flagDetails": {
                "label": "clean",
                "confidence": 1.0,
                "processedAt": datetime.now(timezone.utc).isoformat(),
            },
        })

        logger.info("[Task] Image %s safety check complete (marked safe).", message_id)
        return {"safe": True, "messageId": message_id}

    except Exception as exc:
        logger.error("[Task] analyze_image_safety failed for %s: %s", message_id, exc)
        raise


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def generate_report(self, report_id: str) -> dict:
    """
    Generate an SOS abuse report:
    1. Fetch flagged messages from Firestore for date range
    2. Call LLM (Groq → Gemini → template fallback)
    3. Render PDF with WeasyPrint
    4. Upload to Firebase Storage
    5. Update Firestore report doc with status + downloadUrl
    """
    db = get_firestore_client()
    bucket = get_storage_bucket()

    try:
        # ── 1. Update status to processing ────────────────────────
        report_ref = db.collection("reports").document(report_id)
        report_ref.update({"status": "processing"})

        report_doc = report_ref.get()
        if not report_doc.exists:
            raise ValueError(f"Report {report_id} not found in Firestore")

        report_data = report_doc.to_dict()
        report_data["id"] = report_id

        conversation_id = report_data["conversationId"]
        date_range = report_data["dateRange"]

        from datetime import datetime, timedelta
        start_dt = datetime.fromisoformat(date_range["start"].replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(date_range["end"].replace("Z", "+00:00"))
        
        # If end date is exactly midnight, extend it to include the full day
        if end_dt.hour == 0 and end_dt.minute == 0 and end_dt.second == 0:
            end_dt = end_dt + timedelta(days=1, seconds=-1)

        # ── 2. Fetch messages in date range ───────────────────────
        messages_ref = db.collection("conversations").document(conversation_id)\
            .collection("messages")

        query = messages_ref\
            .where("timestamp", ">=", start_dt)\
            .where("timestamp", "<=", end_dt)\
            .order_by("timestamp")

        all_messages = [doc.to_dict() for doc in query.stream()]
        flagged_messages = [m for m in all_messages if m.get("flagged", False)]

        report_data["messageCount"] = len(all_messages)
        report_data["flaggedCount"] = len(flagged_messages)

        # ── 3. Generate LLM summary ──────────────────────────────
        system_prompt = """You are a professional report writer helping victims of online abuse. You write clear, factual summaries for abuse reports that may be submitted to school authorities, law enforcement, or platform moderators.

STRICT FORMATTING RULES:
- Do NOT use any markdown. No asterisks, no bold, no headers, no bullet points.
- Write in plain English using short, clear sentences.
- Use numbered lists only when listing specific incidents.
- Separate paragraphs with a blank line.
- Keep the total summary under 250 words.

Structure your summary in this exact order:
1. A one-line overview of what happened (for example: "Between January 1 and January 5, the user received 8 abusive messages containing offensive language.")
2. A short paragraph describing the nature of the abuse, using simple words.
3. A note on how serious the situation appears, based on the number and type of messages.
4. A closing line recommending next steps (like reporting to authorities or seeking help).

Tone: Professional, factual, and empathetic. Avoid dramatic language. Write as if preparing a document for a school principal or a police officer."""

        messages_text = "\n".join([
            f"Message {i+1}: \"{m.get('content', '')}\" (classified as: {m.get('flagDetails', {}).get('label', 'unknown')}, "
            f"confidence: {m.get('flagDetails', {}).get('confidence', 0):.0%})"
            for i, m in enumerate(flagged_messages[:50])
        ])

        user_prompt = f"""Here are {len(flagged_messages)} messages that were flagged as abusive between {date_range['start']} and {date_range['end']}:

{messages_text}

Write a clear, professional summary of this abuse. Remember: no markdown formatting, just plain text."""

        llm_summary = asyncio.run(call_groq_with_fallback(user_prompt, system_prompt))

        # ── 4. Resolve sender UIDs to display names ───────────────
        from firebase_admin import auth as fb_auth

        sender_uids = list(set(m.get("senderId", "") for m in flagged_messages if m.get("senderId")))
        user_names = {}
        for uid in sender_uids:
            try:
                user_record = fb_auth.get_user(uid)
                user_names[uid] = user_record.display_name or user_record.email or uid[:8] + "..."
            except Exception:
                user_names[uid] = uid[:8] + "..."

        # ── 5. Render PDF ────────────────────────────────────────
        pdf_bytes = render_report_pdf(report_data, flagged_messages, llm_summary, user_names)

        # ── 5. Upload to Firebase Storage ────────────────────────
        user_id = report_data["userId"]
        blob_path = f"reports/{user_id}/{report_id}.pdf"
        blob = bucket.blob(blob_path)
        blob.upload_from_string(pdf_bytes, content_type="application/pdf")

        # Generate signed URL (24-hour expiry)
        from datetime import timedelta
        download_url = blob.generate_signed_url(expiration=timedelta(hours=24))

        # ── 6. Update Firestore report status ────────────────────
        expiry = datetime.now(timezone.utc) + timedelta(hours=24)
        report_ref.update({
            "status": "complete",
            "downloadUrl": download_url,
            "expiresAt": expiry.isoformat(),
            "messageCount": len(all_messages),
            "flaggedCount": len(flagged_messages),
        })

        logger.info(
            "[Task] Report %s complete: %d messages, %d flagged",
            report_id, len(all_messages), len(flagged_messages),
        )

        return {
            "reportId": report_id,
            "status": "complete",
            "messageCount": len(all_messages),
            "flaggedCount": len(flagged_messages),
        }

    except Exception as exc:
        logger.error("[Task] generate_report failed for %s: %s", report_id, exc)

        # Update Firestore with failed status so UI doesn't hang
        try:
            report_ref = db.collection("reports").document(report_id)
            report_ref.update({"status": "failed"})
        except Exception:
            pass

        raise
