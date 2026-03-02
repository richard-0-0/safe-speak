"""
SafeSpeak — Reports Router
Handles SOS report generation requests and status polling.
"""
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.security import verify_firebase_token
from app.core.firebase import get_firestore_client
from app.models.schemas import ReportGenerateRequest, ReportGenerateResponse, ReportStatusResponse
from app.workers.tasks import generate_report
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/generate", response_model=ReportGenerateResponse, status_code=202)
@limiter.limit("5/hour")
async def generate_sos_report(
    request: Request,
    payload: ReportGenerateRequest,
    uid: str = Depends(verify_firebase_token),
):
    """
    Enqueue a background SOS report generation job.
    Returns immediately with a jobId for status polling.
    """
    db = get_firestore_client()

    # Verify user is a participant in the conversation
    convo_ref = db.collection("conversations").document(payload.conversationId)
    convo_doc = convo_ref.get()

    if not convo_doc.exists:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    if uid not in convo_doc.to_dict().get("participants", []):
        raise HTTPException(status_code=403, detail="You are not a participant in this conversation.")

    # Create report document in Firestore
    from google.cloud.firestore import SERVER_TIMESTAMP

    report_id = f"report_{uuid.uuid4().hex[:12]}"
    job_id = f"job_{uuid.uuid4().hex[:8]}"

    report_ref = db.collection("reports").document(report_id)
    report_ref.set({
        "userId": uid,
        "conversationId": payload.conversationId,
        "dateRange": {
            "start": payload.startDate,
            "end": payload.endDate,
        },
        "jobId": job_id,
        "status": "queued",
        "downloadUrl": None,
        "expiresAt": None,
        "createdAt": SERVER_TIMESTAMP,
        "messageCount": 0,
        "flaggedCount": 0,
    })

    # Dispatch background job
    generate_report.delay(report_id)

    logger.info("[Reports] SOS report %s queued by user %s", report_id, uid)
    return ReportGenerateResponse(jobId=job_id, status="queued", estimatedSeconds=20)


@router.get("/status/{job_id}", response_model=ReportStatusResponse)
@limiter.limit("60/minute")
async def get_report_status(
    request: Request,
    job_id: str,
    uid: str = Depends(verify_firebase_token),
):
    """
    Poll the status of a report generation job.
    Frontend calls this every 3 seconds until complete or failed.
    """
    db = get_firestore_client()

    # Find report by jobId
    reports_ref = db.collection("reports")
    query = reports_ref.where("jobId", "==", job_id).where("userId", "==", uid).limit(1)
    results = list(query.stream())

    if not results:
        raise HTTPException(status_code=404, detail="Report not found or access denied.")

    report_data = results[0].to_dict()

    return ReportStatusResponse(
        jobId=job_id,
        status=report_data.get("status", "queued"),
        downloadUrl=report_data.get("downloadUrl"),
        expiresAt=report_data.get("expiresAt"),
        messageCount=report_data.get("messageCount", 0),
        flaggedCount=report_data.get("flaggedCount", 0),
    )
