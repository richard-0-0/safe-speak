from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# ── Auth & User Models ────────────────────────────────────────────────

class UserProfile(BaseModel):
    uid: str
    displayName: str
    email: str
    photoURL: Optional[str] = None

class ConversationCreate(BaseModel):
    participantEmail: EmailStr


# ── Messaging Models ──────────────────────────────────────────────────

class MessageRequest(BaseModel):
    conversationId: str
    content: str

class MessageResponse(BaseModel):
    messageId: str
    status: str = "processing"

class ImageMessageResponse(BaseModel):
    messageId: str
    storageUrl: str
    status: str = "pending_review"

class ReadMessagesRequest(BaseModel):
    conversationId: str
    messageIds: List[str]

class EditMessageRequest(BaseModel):
    content: str


# ── SOS Report Models ─────────────────────────────────────────────────

class ReportGenerateRequest(BaseModel):
    conversationId: str
    startDate: str  # ISO 8601 string
    endDate: str    # ISO 8601 string

class ReportGenerateResponse(BaseModel):
    jobId: str
    status: str = "queued"
    estimatedSeconds: int = 20

class ReportStatusResponse(BaseModel):
    jobId: str
    status: str
    downloadUrl: Optional[str] = None
    expiresAt: Optional[str] = None
    messageCount: int = 0
    flaggedCount: int = 0


# ── Chatbot & AI Models ───────────────────────────────────────────────

class FlagDetails(BaseModel):
    label: str
    confidence: float
    processedAt: str

class ChatbotAnalyzeResponse(BaseModel):
    extractedText: str
    classification: FlagDetails
    chatbotResponse: str
    sessionId: str

class ChatbotMessageRequest(BaseModel):
    sessionId: str
    message: str

class ChatbotMessageResponse(BaseModel):
    response: str
    sessionId: str
