# SafeSpeak — Application Working Documentation

SafeSpeak is an AI-powered real-time messaging platform that detects hate speech, threats, and offensive language automatically. It provides users with safe communication, AI analysis tools, and the ability to generate SOS abuse reports.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Directory Structure](#2-directory-structure)
3. [Tech Stack](#3-tech-stack)
4. [Backend Working](#4-backend-working)
5. [Frontend Working](#5-frontend-working)
6. [Core Features & User Flows](#6-core-features--user-flows)
7. [ML Pipeline](#7-ml-pipeline)
8. [Database (Firestore) Schema](#8-database-firestore-schema)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Environment Variables](#10-environment-variables)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│  Firebase Auth (Client SDK) ─── Firestore Real-Time Listeners   │
│  Pages: Login | Chat | Chatbot                                  │
│  Axios HTTP Client → Backend API                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (Bearer Token)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI + Python)                    │
│  Auth Router │ Messages Router │ Chatbot Router │ Reports Router│
│  Firebase Admin SDK │ Rate Limiting │ CORS │ Sentry             │
└──────┬──────────────┬──────────────┬───────────────┬────────────┘
       │              │              │               │
       ▼              ▼              ▼               ▼
┌────────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────────────┐
│  Firestore │ │DistilBERT  │ │ LLM API  │ │  Celery Workers     │
│  (Database)│ │ONNX Runtime│ │Groq/     │ │  (Redis Broker)     │
│            │ │(Inference) │ │Gemini    │ │  - Text Analysis    │
│  Firebase  │ │            │ │          │ │  - Image Safety     │
│  Storage   │ │ Tesseract  │ │ Template │ │  - Report Gen (PDF) │
│  (Files)   │ │ OCR        │ │ Fallback │ │                     │
└────────────┘ └────────────┘ └──────────┘ └─────────────────────┘
```

---

## 2. Directory Structure

```
safe-speak/
├── backend/                        # Python FastAPI backend
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point (lifespan, CORS, routers)
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic settings (env vars)
│   │   │   ├── firebase.py         # Firebase Admin SDK init (Firestore + Storage)
│   │   │   └── security.py         # JWT/Firebase token verification middleware
│   │   ├── models/
│   │   │   └── schemas.py          # Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── auth.py             # User profiles, conversations, search
│   │   │   ├── messages.py         # Text/image messaging with ML dispatch
│   │   │   ├── chatbot.py          # Screenshot OCR → DistilBERT → LLM chatbot
│   │   │   └── reports.py          # SOS report generation + status polling
│   │   ├── services/
│   │   │   ├── inference.py        # DistilBERT ONNX Runtime inference engine
│   │   │   ├── llm.py             # LLM service (Groq → Gemini → template fallback)
│   │   │   ├── ocr.py             # Tesseract OCR with OpenCV preprocessing
│   │   │   └── pdf.py             # WeasyPrint PDF report renderer
│   │   └── workers/
│   │       ├── celery_app.py       # Celery configuration (Redis broker)
│   │       └── tasks.py           # Async tasks: text analysis, image safety, reports
│   ├── Dockerfile / Dockerfile.render
│   ├── docker-compose.yml          # Local dev: API + Worker + Redis
│   ├── start.sh                    # Production startup (API + Worker in one container)
│   └── requirements.txt
│
├── frontend/                       # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx                 # Root component with routing
│   │   ├── main.tsx                # Vite entry point
│   │   ├── pages/
│   │   │   ├── Login.tsx           # Login/Register page
│   │   │   ├── Chat.tsx            # Main chat page (sidebar + chat window)
│   │   │   └── Chatbot.tsx         # AI chatbot assistant page
│   │   ├── components/
│   │   │   ├── auth/               # LoginForm, RegisterForm
│   │   │   ├── chat/               # ChatWindow, ConversationList, MessageBubble, ImageMessage
│   │   │   ├── chatbot/            # ChatbotPanel, FileUploadZone
│   │   │   └── sos/                # SOSButton, DateRangePicker, ReportStatus
│   │   ├── hooks/
│   │   │   ├── useAuth.ts          # Firebase auth state + login/register/logout
│   │   │   ├── useMessages.ts      # Real-time Firestore message listener
│   │   │   ├── useReport.ts        # Report status polling (React Query)
│   │   │   └── useTheme.tsx        # Dark/light theme toggle
│   │   ├── services/
│   │   │   ├── api.ts              # Axios client with Firebase token interceptor
│   │   │   ├── firebase.ts         # Firebase client SDK initialization
│   │   │   └── storage.ts          # Firebase Storage helpers
│   │   └── types/
│   │       └── index.ts            # TypeScript interfaces (Message, Conversation, Report, User)
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── models/                         # ML model files (DistilBERT .safetensors)
├── render.yaml                     # Render.com deployment config
├── firestore.rules                 # Firestore security rules
├── PRD.md                          # Product Requirements Document
├── DEPLOYMENT.md                   # Deployment guide
└── README.md
```

---

## 3. Tech Stack

| Layer          | Technology                                      |
|----------------|------------------------------------------------|
| **Frontend**   | React 18 + TypeScript + Vite                    |
| **Styling**    | Tailwind CSS (custom dark/light theme)          |
| **State**      | TanStack React Query + React Hooks              |
| **Auth**       | Firebase Authentication (Email + Google OAuth)   |
| **Database**   | Cloud Firestore (real-time NoSQL)               |
| **File Storage**| Firebase Cloud Storage                          |
| **Backend**    | Python FastAPI (async)                          |
| **ML Model**   | DistilBERT (fine-tuned, ONNX Runtime)           |
| **OCR**        | Tesseract OCR + OpenCV                          |
| **LLM**        | Groq (Llama 3.3 70B) → Google Gemini 1.5 Flash |
| **PDF**        | WeasyPrint                                      |
| **Task Queue** | Celery + Redis                                  |
| **Deployment** | Render.com (Docker) + Firebase Hosting          |
| **Monitoring** | Sentry (error tracking)                         |

---

## 4. Backend Working

### 4.1 Application Startup (`main.py`)

When the FastAPI server starts:
1. **Firebase Admin SDK** is initialized with service account credentials
2. **DistilBERT ONNX model** is loaded into memory (one-time ~300MB load)
3. **Rate limiting** (SlowAPI) and **CORS middleware** are configured
4. **Sentry** is initialized for error tracking (if DSN is configured)
5. Four routers are registered: `auth`, `messages`, `reports`, `chatbot`
6. A `/health` endpoint reports uptime and model status

### 4.2 Authentication & Security (`core/security.py`)

- Every protected API endpoint has a dependency on `verify_firebase_token`
- This extracts the `Authorization: Bearer <token>` header
- The Firebase Admin SDK verifies the token and returns the user's UID
- Invalid/expired tokens return HTTP 401

### 4.3 API Routers

#### Auth Router (`/api/auth`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/profile` | POST | Create/update user profile in Firestore after login |
| `/heartbeat` | POST | Update `lastSeen` timestamp (online presence) |
| `/conversations` | POST | Create a new 1:1 conversation by participant email |
| `/users/search` | GET | Search for users by email |
| `/users/batch` | POST | Batch lookup user profiles by UIDs |
| `/conversations/{id}` | DELETE | Delete conversation (soft-delete flagged, hard-delete clean) |

#### Messages Router (`/api/messages`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | POST | Send a text message → dispatches async ML analysis |
| `/image` | POST | Upload image → Firebase Storage → dispatches CNN check |
| `/read` | PUT | Mark messages as read (batch update `readBy` array) |
| `/{conv_id}/{msg_id}` | PUT | Edit a text message → re-classifies via ML |
| `/{conv_id}/{msg_id}` | DELETE | Delete message (soft-delete if flagged, hard-delete if clean) |

#### Chatbot Router (`/api/chatbot`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/analyze` | POST | Upload screenshot → OCR → DistilBERT → LLM response |
| `/message` | POST | Follow-up text message in chatbot session |

#### Reports Router (`/api/reports`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/generate` | POST | Queue an SOS report generation job (returns jobId) |
| `/status/{job_id}` | GET | Poll report generation status + download URL |

### 4.4 Services

#### Inference Service (`services/inference.py`)
- **Singleton** `DistilBERTInference` class
- On first startup, converts `.safetensors` → ONNX format (one-time)
- Runs ONNX Runtime with CPU execution provider
- Preprocessing: URL stripping → Unicode normalization → lowercasing → tokenization
- Prediction: tokenize → ONNX inference → softmax → label + confidence
- Returns `{"label": "clean"|"flagged", "confidence": float, "flagged": bool}`
- Messages are flagged when `label != "clean"` AND `confidence >= 85%`

#### LLM Service (`services/llm.py`)
Three-tier fallback chain:
1. **Groq API** — Llama 3.3 70B Versatile (primary, fastest)
2. **Google Gemini 1.5 Flash** (fallback if Groq fails)
3. **Template-based generation** (last resort, no LLM needed)

Functions:
- `classify_flagged_message()` — Sub-classifies flagged messages into: `hate_speech`, `threat`, or `offensive`
- `generate_chatbot_response()` — Generates contextual AI responses for chatbot (warm, supportive tone)
- `call_groq_with_fallback()` — Core LLM call with automatic fallback chain

#### OCR Service (`services/ocr.py`)
- Image preprocessing pipeline: Grayscale → Gaussian Blur (denoise) → Otsu's Threshold
- Tesseract OCR extracts text from processed image
- Returns extracted text, average OCR confidence, and a low-quality warning flag (< 60%)

#### PDF Service (`services/pdf.py`)
- Builds a styled HTML document with:
  - Cover page (branding, date range, report ID)
  - Statistics grid (total messages, flagged, by category)
  - AI-generated summary
  - Evidence table (timestamped flagged messages with classification tags)
  - Disclaimer and footer
- Renders HTML → PDF using WeasyPrint

### 4.5 Celery Background Workers (`workers/tasks.py`)

Three background tasks (all with 3 retries + exponential backoff):

#### `analyze_text_message`
```
Text Message → DistilBERT ONNX → flagged? → LLM Sub-classify → Update Firestore
```
1. Run DistilBERT inference on message content
2. If flagged (confidence ≥ 85%), call LLM to sub-classify as hate_speech / threat / offensive
3. Update the Firestore message document with `flagged` status and `flagDetails`

#### `analyze_image_safety`
```
Image Upload → (CNN check - MVP: auto-safe) → Update Firestore
```
- Currently marks all images as safe (CNN model is a future enhancement)
- Updates `imageBlurred` to `false` so images are visible

#### `generate_report`
```
Report Request → Fetch Flagged Messages → LLM Summary → PDF Render → Upload to Storage → Update Firestore
```
1. Fetch all messages in the conversation's date range from Firestore
2. Filter for flagged messages
3. Generate an LLM narrative summary of the abuse pattern
4. Resolve sender UIDs to display names
5. Render a styled PDF report using WeasyPrint
6. Upload PDF to Firebase Storage with a 24-hour signed URL
7. Update the Firestore report document with `complete` status and download URL

---

## 5. Frontend Working

### 5.1 App Entry Point (`App.tsx`)

- Wraps app in `ThemeProvider` (dark/light mode) and `QueryClientProvider` (React Query)
- Routes:
  - `/login` → Login/Register page
  - `/chat` → Main chat interface (protected)
  - `/chatbot` → AI assistant page (protected)
  - `*` → Redirects to `/login`

### 5.2 Authentication Flow (`hooks/useAuth.ts`)

1. Firebase `onAuthStateChanged` listener monitors login state
2. Three login methods:
   - **Email/Password** login (`signInWithEmailAndPassword`)
   - **Email/Password** registration (`createUserWithEmailAndPassword` + `updateProfile`)
   - **Google OAuth** popup (`signInWithPopup`)
3. After successful auth, `syncProfile()` calls `POST /api/auth/profile` to sync user data to Firestore
4. Logout calls Firebase `signOut`

### 5.3 API Client (`services/api.ts`)

- Axios instance with base URL from `VITE_API_BASE_URL` env var
- **Request interceptor**: Automatically attaches Firebase ID token as `Authorization: Bearer <token>`
- **Response interceptor**: Warns on 401 errors (token expiration)

### 5.4 Real-Time Messaging (`hooks/useMessages.ts`)

- Uses Firestore's `onSnapshot` listener on the messages subcollection
- Orders by timestamp (ascending), limited to 50 messages
- Any Firestore update triggers re-render automatically (real-time)
- Firestore offline persistence is enabled via IndexedDB

### 5.5 Pages

#### Login Page
- Toggle between Login and Register forms
- Dark/light theme toggle in top-right corner
- Auto-redirects to `/chat` if already authenticated
- Gradient mesh background with glassmorphism design

#### Chat Page
- **Sidebar** (desktop: always visible, mobile: slide-out drawer)
  - `ConversationList` — shows all conversations with last message preview
  - "New Conversation" button → modal to enter participant email
- **Chat Window**
  - `ChatWindow` — message input, send text/image, SOS report button
  - `MessageBubble` — individual messages with flag indicators, edit/delete
  - `ImageMessage` — image display with blur for unsafe images
- **Heartbeat**: Sends presence ping every 20 seconds to mark user as online
- **SOS Components**: `SOSButton` → `DateRangePicker` → `ReportStatus` (with polling)

#### Chatbot Page
- `ChatbotPanel` — upload screenshots for AI analysis
- `FileUploadZone` — drag-and-drop image upload
- After upload: OCR → Classification → AI chatbot response
- Follow-up text conversation with session context

### 5.6 SOS Report Flow

1. User clicks SOS button in chat window
2. `DateRangePicker` lets user select a date range
3. Frontend calls `POST /api/reports/generate` → returns `jobId`
4. `useReportStatus` hook polls `GET /api/reports/status/{jobId}` every 3 seconds
5. When status is `complete`, `ReportStatus` component shows download link
6. PDF download URL is valid for 24 hours

---

## 6. Core Features & User Flows

### 6.1 Sending a Text Message
```
User types message → Frontend POST /api/messages
  → Backend writes to Firestore (instant delivery)
  → Backend dispatches Celery task: analyze_text_message
  → Celery worker runs DistilBERT inference
  → If flagged: LLM sub-classifies → updates Firestore flagDetails
  → Frontend's onSnapshot listener picks up the update → shows flag badge
```

### 6.2 Sending an Image
```
User selects image → Frontend POST /api/messages/image
  → Backend validates MIME type + size (max 10MB)
  → Uploads to Firebase Storage (images/pending/ prefix)
  → Writes message to Firestore (imageBlurred = true by default)
  → Dispatches Celery task: analyze_image_safety
  → Worker checks image (MVP: auto-safe) → updates imageBlurred
  → Frontend removes blur overlay when imageBlurred = false
```

### 6.3 Chatbot Screenshot Analysis
```
User uploads screenshot → Frontend POST /api/chatbot/analyze
  → Backend: Tesseract OCR extracts text
  → DistilBERT classifies extracted text
  → LLM generates a supportive response
  → Returns: extractedText + classification + chatbotResponse + sessionId
User asks follow-up → Frontend POST /api/chatbot/message
  → LLM responds using session history context
```

### 6.4 SOS Report Generation
```
User clicks SOS → Selects date range → Frontend POST /api/reports/generate
  → Backend creates report doc in Firestore (status: queued)
  → Dispatches Celery task: generate_report
  → Worker: Fetches flagged messages → LLM summary → PDF render → Upload to Storage
  → Updates Firestore report (status: complete, downloadUrl: signed URL)
Frontend polls every 3s → When complete → Shows download button
```

### 6.5 Message Edit Flow
```
User edits message → Frontend PUT /api/messages/{conv}/{msg}
  → Backend saves original content, updates message
  → Re-dispatches DistilBERT analysis on new content
  → Firestore updates in real-time
```

### 6.6 Message Delete Flow
```
User deletes message → Frontend DELETE /api/messages/{conv}/{msg}
  → If flagged: Soft-delete (preserves for SOS reports)
  → If clean: Hard-delete from Firestore
```

---

## 7. ML Pipeline

### DistilBERT Hate Speech Detection

```
Raw Text → Preprocess → Tokenize → ONNX Runtime → Softmax → Label + Confidence
```

1. **Preprocessing**: Strip URLs → Unicode normalize (NFKC) → lowercase → trim
2. **Tokenization**: DistilBERT tokenizer, max 128 tokens, padded
3. **Inference**: ONNX Runtime (CPU), graph-optimized, 2 threads
4. **Output**: Binary classification → `clean` (0) or `flagged` (1)
5. **Threshold**: A message is flagged only when `label = flagged AND confidence ≥ 85%`
6. **Sub-classification**: Flagged messages are further classified by LLM into:
   - `hate_speech` — targets race, religion, gender, sexuality, disability
   - `threat` — direct or implied violence/intimidation
   - `offensive` — insults, slurs, profanity (catch-all)

### OCR Pipeline (Chatbot)

```
Image Bytes → OpenCV Grayscale → Gaussian Blur → Otsu's Threshold → Tesseract → Cleaned Text
```

---

## 8. Database (Firestore) Schema

### `users/{uid}`
```
{
  uid: string,
  displayName: string,
  email: string,
  photoURL: string | null,
  lastSeen: Timestamp,
  createdAt: Timestamp
}
```

### `conversations/{conversationId}`
```
{
  participants: [uid1, uid2],
  createdAt: Timestamp,
  lastMessage: {
    content: string,
    senderId: string,
    timestamp: Timestamp
  }
}
```

### `conversations/{conversationId}/messages/{messageId}`
```
{
  senderId: string,
  type: "text" | "image",
  content: string,
  timestamp: Timestamp,
  flagged: boolean,
  flagDetails: {
    label: "clean" | "offensive" | "hate_speech" | "threat",
    confidence: float,
    processedAt: string (ISO 8601)
  } | null,
  imageBlurred: boolean,
  readBy: [uid, ...],
  deleted: boolean,
  deletedAt: Timestamp | null,
  deletedBy: string | null,
  edited: boolean,
  editedAt: Timestamp | null,
  originalContent: string | null
}
```

### `reports/{reportId}`
```
{
  userId: string,
  conversationId: string,
  dateRange: { start: string, end: string },
  jobId: string,
  status: "queued" | "processing" | "complete" | "failed",
  downloadUrl: string | null,
  expiresAt: string | null,
  createdAt: Timestamp,
  messageCount: number,
  flaggedCount: number
}
```

---

## 9. Deployment Architecture

### Production (Render.com)

Defined in `render.yaml`:

- **Single Docker container** running both FastAPI + Celery worker via `start.sh`
  - Celery uses `--pool=solo` to share memory (critical for Render's 512MB free tier)
  - ML model is ~300MB in memory
- **Redis** (Upstash or Render Redis) as Celery broker
- **Firebase Hosting** serves the frontend static build

### Local Development (Docker Compose)

Three services in `docker-compose.yml`:
1. `api` — FastAPI server on port 8000
2. `worker` — Celery worker with concurrency=2
3. `redis` — Redis 7 Alpine on port 6379

ML model files are mounted from `../models/models/` into `/app/ml_models/distilbert/`

---

## 10. Environment Variables

### Backend (`.env`)
| Variable | Purpose |
|----------|---------|
| `FIREBASE_PROJECT_ID` | Firebase project identifier |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name |
| `REDIS_URL` | Redis connection URL |
| `CELERY_BROKER_URL` | Celery broker URL (Redis) |
| `CELERY_RESULT_BACKEND` | Celery result backend URL (Redis) |
| `GROQ_API_KEY` | Groq API key for Llama 3.3 |
| `GEMINI_API_KEY` | Google Gemini API key (fallback) |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) |
| `HATE_SPEECH_CONFIDENCE_THRESHOLD` | ML flagging threshold (default: 0.85) |
| `SENTRY_DSN` | Sentry error tracking DSN |
| `ENVIRONMENT` | `development` or `production` |

### Frontend (`.env`)
| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_FIREBASE_API_KEY` | Firebase client API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
