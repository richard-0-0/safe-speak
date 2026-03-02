# SafeSpeak — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** February 23, 2026  
**Author:** SafeSpeak Product Team  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [User Personas](#4-user-personas)
5. [User Stories & Journeys](#5-user-stories--journeys)
6. [System Architecture Overview](#6-system-architecture-overview)
7. [Feature Specifications](#7-feature-specifications)
8. [ML Model Specifications](#8-ml-model-specifications)
9. [API Design](#9-api-design)
10. [Data Models](#10-data-models)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Security & Privacy](#12-security--privacy)
13. [Release Milestones](#13-release-milestones)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Open Questions](#15-open-questions)

---

## 1. Executive Summary

**SafeSpeak** is a real-time messaging platform that combines end-to-end secure communication with proactive AI-driven hate speech detection. It empowers victims of online abuse by automatically flagging harmful content, blurring offensive imagery, and generating formal abuse reports — all without disrupting the natural flow of conversation.

The platform is built on three AI pillars:

- **Fast:** Sub-100ms DistilBERT inference for real-time text flagging.
- **Reliable:** Background LLM-driven SOS report generation for formal documentation.
- **Robust:** OCR + NLP pipeline in the chatbot for analyzing screenshot evidence.

SafeSpeak targets individuals, support communities, and moderation teams who need a trustworthy channel for communication with built-in safety nets.

---

## 💰 Zero-Cost Infrastructure Summary

Every service in this PRD has been chosen to run at **₹0 / $0** during development and MVP scale.

| Service | Free Tier Used | Limit |
|---|---|---|
| Firebase Auth | Spark (free) plan | Unlimited users |
| Cloud Firestore | Spark (free) plan | 50K reads / 20K writes per day |
| Firebase Storage | Spark (free) plan | 5GB storage, 1GB/day download |
| Firebase Hosting | Free tier | 10GB storage, 360MB/day |
| Groq API (Llama 3.3 70B) | Free tier | 14,400 requests/day |
| Gemini 1.5 Flash (fallback) | Free tier | 1M tokens/day |
| Render.com (FastAPI server) | Free tier | Spins down after 15min inactivity |
| Redis Cloud | Free tier | 30MB (sufficient for job queue) |
| Sentry | Developer free plan | 5K errors/month |
| DistilBERT / ONNX Runtime | Open source | Unlimited (self-hosted) |
| Tesseract OCR | Open source | Unlimited (self-hosted) |
| WeasyPrint / ReportLab | Open source | Unlimited (self-hosted) |

> ⚠️ **Scale note:** Free tiers are sufficient for demos, hackathons, and early-stage testing. Once DAU exceeds ~500 or reports exceed 14K/day, the first cost incurred will be the Render.com server upgrade (~$7/month ≈ ₹580/month).

---

## 2. Problem Statement

Online hate speech, harassment, and abuse are pervasive across messaging platforms. Current solutions suffer from three key gaps:

| Gap | Current State | SafeSpeak Solution |
|---|---|---|
| **Reactive Moderation** | Content is reported after damage is done | Flags content before recipient sees it |
| **Fragmented Evidence** | Victims manually screenshot and file reports | Automated PDF evidence reports generated in-app |
| **No Screenshot Analysis** | Abusers exploit image-based messaging to evade detection | OCR + NLP pipeline classifies text in images |

The core insight is that victims need tools, not just moderation. SafeSpeak gives them agency.

---

## 3. Goals & Success Metrics

### 3.1 Product Goals

- **G1:** Reduce the time between abuse and detection to under 200ms.
- **G2:** Enable victims to generate a formal, shareable abuse report in under 60 seconds.
- **G3:** Achieve >90% precision on hate speech detection to minimize false positives that disrupt normal communication.
- **G4:** Support English-language OCR with >90% character accuracy on screenshot uploads.

### 3.2 Key Performance Indicators (KPIs)

| KPI | Target | Measurement Method |
|---|---|---|
| DistilBERT inference latency | < 100ms (p95) | Server-side timing logs |
| Image NSFW classification latency | < 300ms (p95) | Server-side timing logs |
| Message delivery latency | < 200ms | Firestore timestamp delta |
| SOS report generation time | < 30s end-to-end | Background job duration |
| OCR accuracy (English) | > 90% CER | Benchmark test set |
| Hate speech detection precision | > 90% | Offline eval + A/B monitoring |
| System uptime | > 99.5% | Uptime monitoring |
| API error rate | < 0.5% | Error tracking (Sentry) |

---

## 4. User Personas

### Persona 1 — Aisha, The Targeted User
- **Age:** 24, University Student
- **Context:** Experiences harassment in group study chats
- **Need:** Wants evidence collected automatically so she can report without reliving the abuse
- **Pain Point:** Manual screenshotting is traumatic and legally inadmissible in organized form

### Persona 2 — Marcus, The Community Moderator
- **Age:** 34, Online Community Admin
- **Context:** Manages a 500-person support group
- **Need:** Needs proactive flagging so he can act before harm is done
- **Pain Point:** Current tools require him to be online 24/7

### Persona 3 — Dev, The Bystander/Ally
- **Age:** 28, Software Engineer
- **Context:** Receives forwarded abusive screenshots from friends
- **Need:** Wants to help friends document and report abuse from screenshots
- **Pain Point:** No easy way to analyze and formalize third-party evidence

---

## 5. User Stories & Journeys

### 5.1 Core User Stories

**Authentication**
- As a user, I want to register with my email or Google account so I can access the platform quickly.
- As a user, I want my session to persist across browser refreshes so I don't need to log in repeatedly.

**Messaging**
- As a user, I want to send and receive text messages in real time so conversations feel natural.
- As a user, I want to send images in chats and have abusive images automatically blurred so I am protected from unexpected exposure.
- As a user, I want to see a subtle indicator when a message has been flagged as potentially harmful.

**SOS Reporting**
- As a victim, I want to click an SOS button, select a date range, and receive a downloadable PDF abuse report so I can share formal evidence with authorities or platform support teams.
- As a victim, I want report generation to happen in the background so I can continue using the app.

**Chatbot & OCR**
- As a user, I want to upload a screenshot of an abusive conversation to the chatbot so it can analyze and classify the text within it.
- As a user, I want the chatbot to confirm whether extracted text contains hate speech and suggest next steps.

### 5.2 Critical User Journey — SOS Report Flow

```
User clicks SOS button
        │
        ▼
Date range picker appears
        │
        ▼
User selects start & end date → submits
        │
        ▼
Frontend calls POST /api/reports/generate
        │
        ▼
API enqueues background job (Celery/RQ) → returns job_id immediately
        │
        ▼
Frontend polls GET /api/reports/status/{job_id} every 3s
        │
        ▼
Background worker:
  1. Fetches messages from Firestore for date range
  2. Filters flagged messages
  3. Calls LLM to summarize & structure report
  4. Renders PDF
  5. Uploads PDF to Firebase Storage
  6. Updates job status → COMPLETE + download_url
        │
        ▼
Frontend shows download button → user saves PDF
```

---

## 6. System Architecture Overview

### 6.1 High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  React Web App (Vite)                                            │
│  ├─ Auth Module (Firebase Auth SDK)                              │
│  ├─ Chat UI (Firestore real-time listener)                       │
│  ├─ SOS Module (polling-based job tracker)                       │
│  └─ Chatbot UI (file upload + response display)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / REST
┌────────────────────────▼────────────────────────────────────────┐
│                       API LAYER                                  │
│  FastAPI (Python 3.11)                                           │
│  ├─ /auth — JWT validation middleware                            │
│  ├─ /messages — message write + async ML dispatch               │
│  ├─ /reports — SOS trigger + job status polling                  │
│  └─ /chatbot — OCR + NLP pipeline endpoint                      │
└────────┬───────────────────────────────────┬────────────────────┘
         │                                   │
┌────────▼────────┐               ┌──────────▼──────────┐
│  INFERENCE      │               │  BACKGROUND WORKER  │
│  ENGINE         │               │  (Celery + Redis)   │
│  ├─ DistilBERT  │               │  ├─ Report Generator │
│  │  (ONNX RT)   │               │  ├─ LLM Caller       │
│  ├─ CNN NSFW    │               │  └─ PDF Renderer     │
│  └─ OCR (Tess.) │               └──────────┬──────────┘
└────────┬────────┘                          │
         │                                   │
┌────────▼───────────────────────────────────▼────────────────────┐
│                       DATA LAYER                                  │
│  Firebase Firestore (messages, users, reports metadata)          │
│  Firebase Storage (images, generated PDFs)                       │
│  Redis (job queue, inference result cache)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast HMR, strong typing |
| Styling | Tailwind CSS | Rapid UI development |
| Auth | Firebase Authentication | Managed OAuth + JWT |
| Realtime DB | Cloud Firestore | Real-time listeners, offline persistence |
| File Storage | Firebase Storage | Integrated with Firestore security rules |
| API Server | FastAPI (Python 3.11) | Async-native, auto OpenAPI docs |
| ML Inference | ONNX Runtime + PyTorch | Sub-100ms DistilBERT inference |
| OCR | Tesseract 5 via pytesseract | >90% English accuracy, open-source |
| Background Jobs | Celery + Redis Cloud (free 30MB tier) | Reliable async task queue — ₹0 |
| LLM | Groq API — Llama 3.3 70B (free tier) | Report summarization & chatbot — 14,400 req/day free, ₹0 |
| PDF Generation | WeasyPrint or ReportLab | Programmatic PDF rendering — open source, ₹0 |
| Hosting | Render.com free tier (API) + Firebase Hosting (frontend) | Always-on free hosting — ₹0 |
| Containerization | Docker + Docker Compose | Reproducible deployments — ₹0 |
| Monitoring | Sentry free tier + self-hosted Grafana | Error tracking + metrics — ₹0 |

---

## 7. Feature Specifications

### 7.1 Feature: User Authentication (FR-01, FR-02)

**Description:** Users can register and log in via Email/Password or Google OAuth. Sessions persist across browser restores.

**Acceptance Criteria:**
- User can register with a valid email and password (min 8 chars, 1 uppercase, 1 number).
- User can sign in with Google in ≤ 2 clicks.
- JWT token is stored in `httpOnly` cookie (not localStorage) to prevent XSS.
- Token is refreshed silently before expiry; user is never unexpectedly logged out.
- Failed login attempts are rate-limited (5 attempts → 15-minute lockout).

**Edge Cases:**
- Email already registered → show "Account exists, try logging in."
- Google account email collides with existing email account → merge accounts.

---

### 7.2 Feature: Real-Time Messaging (FR-03, FR-04)

**Description:** Users can send text and image messages with sub-200ms delivery. History is persisted in Firestore.

**Acceptance Criteria:**
- Text messages appear in the recipient's UI within 200ms under normal network conditions.
- Message order is deterministic (Firestore server timestamp used, not client clock).
- Images are uploaded to Firebase Storage; only the URL is stored in Firestore.
- Conversation history loads the last 50 messages on open, with infinite scroll to load older messages.
- Firestore offline persistence is enabled — messages composed offline are queued and sent when connectivity is restored.

**Message Data Contract:**

```json
{
  "id": "msg_abc123",
  "conversationId": "conv_xyz",
  "senderId": "uid_123",
  "type": "text" | "image",
  "content": "string (text content or image URL)",
  "timestamp": "Firestore ServerTimestamp",
  "flagged": false,
  "flagDetails": {
    "label": "hate_speech" | "offensive" | "clean",
    "confidence": 0.94,
    "processedAt": "ISO8601"
  },
  "imageBlurred": false
}
```

---

### 7.3 Feature: Real-Time Hate Speech Detection (FR-05)

**Description:** Every text message is asynchronously analyzed by the fine-tuned DistilBERT model within 100ms of being written to Firestore. The result updates the message document in-place.

**Flow:**
1. Client writes message to Firestore → message appears immediately in UI.
2. Firestore write triggers a Cloud Function (or API webhook) → dispatches to inference engine.
3. Inference engine returns `{label, confidence}` within 100ms.
4. Firestore message document is updated with `flagged: true/false` + `flagDetails`.
5. Client real-time listener picks up the update → UI renders flag indicator (subtle ⚠️ badge on flagged messages).

**Acceptance Criteria:**
- Flagging does **not** block message delivery.
- Messages flagged with confidence > 0.85 show a warning indicator to the recipient.
- Flagged messages are **not** deleted or hidden — only marked, preserving evidence.
- The sender is **not** notified that their message was flagged (to prevent evasion).

**Label Taxonomy:**

| Label | Description |
|---|---|
| `clean` | No harmful content detected |
| `offensive` | Mildly offensive language, low confidence |
| `hate_speech` | High-confidence hate speech |
| `threat` | Direct threatening language |

---

### 7.4 Feature: Image Safety (FR-06)

**Description:** Images are analyzed by a CNN model for NSFW/abusive content before being displayed to the recipient. Positive detections result in a blurred preview with an opt-in reveal.

**Flow:**
1. Sender uploads image → goes to Firebase Storage in a `pending/` prefix.
2. API triggers CNN inference on the image URL.
3. If clean: image is moved to `approved/` prefix → displayed normally.
4. If flagged: image stays in `pending/` with `imageBlurred: true` → recipient sees blurred preview with "Tap to reveal (flagged content)" warning.

**Acceptance Criteria:**
- Recipient is never shown unfiltered NSFW/abusive content automatically.
- Reveal action requires a deliberate click + confirmation dialog.
- CNN inference completes within 300ms (p95).
- Unsupported image formats (non-JPEG/PNG/WEBP) are rejected with a clear error.

---

### 7.5 Feature: SOS Reporting System (FR-07, FR-08, FR-09)

**Description:** A one-click SOS tool that compiles flagged messages from a selected time range into a formal, downloadable PDF abuse report using an LLM.

**UI Flow:**
1. User clicks **SOS** button (pinned to chat header).
2. Modal opens with a date range picker (default: last 7 days).
3. User clicks **Generate Report** → spinner appears, modal closes.
4. Toast notification: "Your report is being generated. We'll notify you when it's ready."
5. Background job completes → in-app notification appears with **Download PDF** button.

**Report Contents:**
- Cover page: platform name, report date, victim user ID (anonymized display name).
- Summary section: LLM-generated narrative summary of the abuse pattern.
- Evidence table: timestamp, sender ID (hashed), message content, flag label, confidence score.
- Statistics: total messages in range, total flagged, breakdown by label.
- Footer: disclaimer about AI-generated content and instructions for submission to authorities.

**Acceptance Criteria:**
- Report generation must not block the UI (background worker — Celery task).
- If LLM API is unavailable, job is retried up to 3 times with exponential backoff.
- If retries are exhausted, user is notified with a "Report failed — try again" prompt.
- Generated PDFs are stored in Firebase Storage under the user's private folder.
- PDF download links expire after 24 hours (signed URLs).
- Report is generated within 30 seconds for up to 500 messages.

---

### 7.6 Feature: Chatbot & OCR Pipeline (FR-10, FR-11, FR-12)

**Description:** An in-app AI chatbot that accepts screenshot uploads, extracts text via OCR, classifies it for hate speech, and guides the user through next steps.

**Chatbot Capabilities:**
- Accept image uploads (JPEG, PNG, WEBP, max 10MB).
- Extract text from image using Tesseract OCR.
- Pass extracted text through DistilBERT classification pipeline.
- Respond with: extracted text, classification result, confidence, and recommended actions.
- Support follow-up questions (e.g., "How do I report this?" or "What does this label mean?").

**Chatbot Response Schema:**

```
🔍 Text Extracted:
"[OCR output]"

⚠️ Classification: HATE SPEECH (94% confidence)

This message contains language that falls under our hate speech policy.

Recommended Actions:
• Generate an SOS report to document this evidence
• Block the sender in your platform settings
• Report to platform via their abuse reporting page

Would you like me to add this to a report?
```

**Acceptance Criteria:**
- OCR must achieve >90% Character Error Rate (CER) on standard English screenshots.
- System handles low-quality or blurry images gracefully with a "Low image quality — results may be inaccurate" warning.
- Chatbot maintains a session context of up to 10 turns.
- Non-image messages to the chatbot are handled by the LLM as general hate speech guidance questions.

---

## 8. ML Model Specifications

### 8.1 Text Classification — DistilBERT

| Property | Value |
|---|---|
| Base Model | `distilbert-base-uncased` |
| Task | Multi-class sequence classification |
| Classes | `clean`, `offensive`, `hate_speech`, `threat` |
| Fine-tuning Dataset | HatEval 2019 + Measuring Hate Speech (UC Berkeley) |
| Max Sequence Length | 128 tokens |
| Inference Runtime | ONNX Runtime (CPU) |
| Target Latency | < 100ms per inference |
| Serving | Loaded once at startup, kept in memory |
| Evaluation Metrics | Precision > 90%, Recall > 85%, F1 > 87% |

**Preprocessing Pipeline:**
1. Strip URLs, replace with `[URL]` token.
2. Normalize unicode characters.
3. Lowercase (uncased model).
4. Tokenize with `DistilBertTokenizerFast`.
5. Truncate/pad to 128 tokens.

---

### 8.2 Image Classification — CNN NSFW Detector

| Property | Value |
|---|---|
| Architecture | EfficientNet-B0 (fine-tuned) |
| Task | Binary classification (safe / unsafe) |
| Training Data | NSFW dataset (Open Images subset) + custom abusive imagery dataset |
| Input Size | 224 × 224 px |
| Inference Runtime | ONNX Runtime or TorchScript |
| Target Latency | < 300ms per image |

---

### 8.3 OCR Engine

| Property | Value |
|---|---|
| Engine | Tesseract 5 (LSTM mode) |
| Language | English (`eng`) |
| Preprocessing | Grayscale → denoise → deskew → threshold |
| Post-processing | Regex cleanup of common OCR artifacts |
| Accuracy Target | > 90% CER on clean English screenshots |

---

### 8.4 LLM — Report Generation

| Property | Value |
|---|---|
| Provider | Groq API — Llama 3.3 70B (free tier, 14,400 req/day) |
| Cost | ₹0 — free tier sufficient for dev + MVP scale |
| Usage | Report summarization + chatbot fallback |
| Prompt Strategy | System prompt with structured JSON output schema |
| Fallback | If Groq unavailable → Gemini 1.5 Flash (free tier, 1M tokens/day) → template-based PDF report |
| Max Tokens | 2048 per report summary |
| Rate Limiting | Handled via Celery retry with exponential backoff |

---

## 9. API Design

### 9.1 Authentication

All endpoints (except `/auth/*`) require a valid Firebase JWT in the `Authorization: Bearer <token>` header.

---

### 9.2 Endpoints

#### `POST /api/messages`
Writes a message to Firestore and triggers async ML analysis.

**Request:**
```json
{
  "conversationId": "conv_xyz",
  "type": "text",
  "content": "Hello there"
}
```

**Response `202 Accepted`:**
```json
{
  "messageId": "msg_abc123",
  "status": "processing"
}
```

---

#### `POST /api/messages/image`
Uploads an image, triggers CNN safety check, returns blurred status.

**Request:** `multipart/form-data` with `conversationId` + `file`

**Response `202 Accepted`:**
```json
{
  "messageId": "msg_img456",
  "storageUrl": "https://storage.../pending/...",
  "status": "pending_review"
}
```

---

#### `POST /api/reports/generate`
Enqueues a background SOS report generation job.

**Request:**
```json
{
  "conversationId": "conv_xyz",
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-02-01T00:00:00Z"
}
```

**Response `202 Accepted`:**
```json
{
  "jobId": "job_789",
  "status": "queued",
  "estimatedSeconds": 20
}
```

---

#### `GET /api/reports/status/{jobId}`
Polls the status of a report generation job.

**Response `200 OK`:**
```json
{
  "jobId": "job_789",
  "status": "complete",
  "downloadUrl": "https://storage.../reports/report_xyz.pdf",
  "expiresAt": "2026-02-24T12:00:00Z"
}
```

---

#### `POST /api/chatbot/analyze`
Accepts a screenshot and returns OCR + classification results.

**Request:** `multipart/form-data` with `file` + optional `sessionId`

**Response `200 OK`:**
```json
{
  "extractedText": "You are worthless...",
  "classification": {
    "label": "hate_speech",
    "confidence": 0.94
  },
  "chatbotResponse": "This message contains hate speech. Here are your options...",
  "sessionId": "sess_abc"
}
```

---

#### `POST /api/chatbot/message`
Sends a follow-up text message to the chatbot.

**Request:**
```json
{
  "sessionId": "sess_abc",
  "message": "How do I report this to the police?"
}
```

**Response `200 OK`:**
```json
{
  "response": "To report online abuse to authorities, you should..."
}
```

---

## 10. Data Models

### 10.1 Firestore Collections

#### `users/{userId}`
```json
{
  "uid": "string",
  "displayName": "string",
  "email": "string",
  "photoURL": "string | null",
  "createdAt": "Timestamp",
  "lastSeen": "Timestamp"
}
```

#### `conversations/{conversationId}`
```json
{
  "participants": ["uid_1", "uid_2"],
  "createdAt": "Timestamp",
  "lastMessage": {
    "content": "string",
    "senderId": "string",
    "timestamp": "Timestamp"
  }
}
```

#### `conversations/{conversationId}/messages/{messageId}`
```json
{
  "senderId": "string",
  "type": "text | image",
  "content": "string",
  "timestamp": "Timestamp",
  "flagged": "boolean",
  "flagDetails": {
    "label": "clean | offensive | hate_speech | threat",
    "confidence": "number",
    "processedAt": "Timestamp"
  },
  "imageBlurred": "boolean"
}
```

#### `reports/{reportId}`
```json
{
  "userId": "string",
  "conversationId": "string",
  "dateRange": {
    "start": "Timestamp",
    "end": "Timestamp"
  },
  "jobId": "string",
  "status": "queued | processing | complete | failed",
  "downloadUrl": "string | null",
  "expiresAt": "Timestamp | null",
  "createdAt": "Timestamp",
  "messageCount": "number",
  "flaggedCount": "number"
}
```

---

## 11. Non-Functional Requirements

### 11.1 Performance

| Requirement | Target | Notes |
|---|---|---|
| DistilBERT inference | < 100ms p95 | ONNX Runtime, model warm |
| CNN image inference | < 300ms p95 | ONNX Runtime |
| Message delivery | < 200ms | Firestore real-time |
| API response (sync) | < 500ms p95 | Excludes ML inference |
| SOS report generation | < 30s for 500 messages | Background job |
| OCR processing | < 5s per image | Tesseract local |

### 11.2 Scalability

- The inference engine must be stateless and horizontally scalable via Docker replicas.
- Celery workers scale independently from the API server.
- Firestore scales automatically; no manual sharding required at MVP scale (<10k DAU).

### 11.3 Reliability

- API failures in LLM calls trigger Celery retry with exponential backoff (3 retries, 5s/15s/45s delays).
- Firestore offline persistence ensures zero message loss during connectivity drops.
- Health check endpoints (`GET /health`) expose service status for load balancer probes.

### 11.4 Availability & Hosting (₹0 Stack)

- Target: 99.5% monthly uptime.
- Firebase services (Auth, Firestore, Storage) are managed with their own SLAs (99.95%) — **free tier**.
- **Frontend:** Deployed on Firebase Hosting (free tier — 10GB storage, 360MB/day transfer).
- **FastAPI API Server:** Deployed on Render.com free tier (spins down after 15min inactivity — acceptable for demo/MVP; upgrade to paid for always-on production).
- **Celery Workers:** Run on the same Render instance or locally during development.
- **Redis:** Redis Cloud free tier (30MB) — sufficient for job queue at MVP scale.
- **Note:** For a production launch with real users, Render's $7/month plan eliminates spin-down. Until then, cold start is ~30 seconds on first request.

---

## 12. Security & Privacy

### 12.1 Authentication & Authorization

- All Firebase JWTs are validated server-side on every API request.
- Firestore Security Rules ensure users can only read/write their own conversations.
- API endpoints enforce ownership checks — users cannot fetch another user's reports.

### 12.2 Data Protection

- Passwords are never stored — Firebase Auth handles credential management.
- Images in `pending/` storage are accessible only via server-side signed URLs.
- Generated PDFs are stored in private user-scoped paths with 24-hour expiring signed URLs.
- All data in transit is encrypted via TLS 1.3.

### 12.3 Input Validation & Sanitization

- All API inputs validated with Pydantic models (FastAPI).
- Text content is stripped of SQL/NoSQL injection patterns before processing.
- File uploads validate MIME type server-side (not just extension).
- Max file size enforced at 10MB for images.

### 12.4 Rate Limiting

- Authentication endpoints: 10 requests/minute per IP.
- Message send: 60 messages/minute per user.
- Report generation: 5 reports/hour per user.
- Chatbot: 30 requests/minute per user.

### 12.5 Privacy Considerations

- Flagged message data is used only within the user's own report context.
- No message content is sent to external services except the LLM (for report generation) — and only for the messages the user explicitly includes in their report.
- OCR-extracted text is processed in memory and not persisted beyond the chatbot session.
- Users can delete their account and all associated data (GDPR compliance).

---

## 13. Release Milestones

### Phase 1 — MVP (Weeks 1–6): Core Messaging + Detection
- [ ] Firebase Auth (Email + Google OAuth)
- [ ] Real-time text messaging (Firestore)
- [ ] DistilBERT inference endpoint (ONNX)
- [ ] Async message flagging pipeline
- [ ] Basic chat UI with flag indicators

**Exit Criteria:** Internal team can send messages, receive real-time flags, model achieves >90% precision on test set.

---

### Phase 2 — Safety Layer (Weeks 7–10): Image Safety + SOS
- [ ] Image upload + Firebase Storage integration
- [ ] CNN NSFW classification endpoint
- [ ] Image blur UX with reveal flow
- [ ] SOS button + date range picker UI
- [ ] Celery + Redis background job infrastructure
- [ ] LLM report generation + PDF rendering
- [ ] Report status polling + download flow

**Exit Criteria:** End-to-end SOS report generated in <30s. Abusive images are blurred before display.

---

### Phase 3 — Chatbot + OCR (Weeks 11–14): Evidence Analysis
- [ ] Chatbot UI component
- [ ] Tesseract OCR integration
- [ ] OCR + DistilBERT pipeline endpoint
- [ ] LLM-backed chatbot conversation flow
- [ ] Session management (up to 10 turns)

**Exit Criteria:** OCR achieves >90% CER on English test set. Chatbot correctly classifies uploaded screenshots.

---

### Phase 4 — Hardening (Weeks 15–16): Security, Monitoring, Launch Prep
- [ ] Firestore Security Rules audit
- [ ] Rate limiting on all endpoints
- [ ] Sentry integration (error tracking)
- [ ] Prometheus + Grafana dashboards
- [ ] Load testing (Locust — 1000 concurrent users)
- [ ] GDPR data deletion flow
- [ ] Penetration testing (external)

**Exit Criteria:** All KPIs met under load. Security review passed.

---

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| DistilBERT latency exceeds 100ms on CPU | Medium | High | Benchmark early; use ONNX quantization; fallback to async-only flagging |
| Groq free tier rate limit hit (14,400 req/day) | Low | Medium | Cache report outputs; queue non-urgent requests; fallback to Gemini 1.5 Flash free tier |
| OCR accuracy drops on non-standard fonts/screenshots | High | Medium | Preprocess images (deskew, threshold); display confidence warning to user |
| False positives disturbing normal conversations | Medium | High | Tune confidence threshold; only show warning at >85% confidence |
| Render.com free tier spin-down (cold start ~30s) | High | Medium | Acceptable for demo/MVP; add a cron ping to keep alive; upgrade to $7/mo plan for production |
| Firebase free tier limits exceeded (50k reads/day) | Low | Medium | Paginate message loads; cache frequently-read data client-side |
| LLM API unavailability (Groq) | Low | High | Celery retry with backoff; fallback to Gemini 1.5 Flash; last resort: template-based PDF |
| Firebase Storage free tier (5GB) exceeded | Low | Low | Auto-delete pending images after 48h; expire PDF download links after 24h |

---

## 15. Open Questions

1. **Multi-language support:** DistilBERT model is currently English-only. When do we need to support other languages, and what is the training data strategy?

2. **Real-time notification delivery:** Should flagged message alerts also trigger push notifications (Firebase Cloud Messaging)? This was not specified in the SRS.

3. **Chatbot persistence:** Should chatbot sessions persist across browser sessions, or reset on each visit? Current spec assumes ephemeral sessions.

4. **Moderation dashboard:** Is there a planned admin/moderator view for reviewing flagged messages across the platform, or is this purely a user-facing tool?

5. **Legal admissibility:** Should the PDF reports be digitally signed or include a tamper-evident hash to support legal proceedings? Recommend consulting a legal advisor before Phase 2 launch.

6. **Threshold configuration:** Should confidence thresholds (e.g., 0.85 for flagging) be configurable per user or per conversation, or are they global constants?

7. **Group chats:** The current SRS implies 1:1 messaging. Is group chat in scope, and how does flagging work in a group context?

---

*This PRD is a living document. It should be reviewed and updated at the start of each phase milestone.*
