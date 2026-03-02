# SafeSpeak — Tech Stack

**Version:** 1.0  
**Last Updated:** February 23, 2026  
**Total Infrastructure Cost:** ₹0 (MVP & Development Scale)

---

## Table of Contents

1. [Stack at a Glance](#1-stack-at-a-glance)
2. [Frontend](#2-frontend)
3. [Backend & API](#3-backend--api)
4. [AI & ML Pipeline](#4-ai--ml-pipeline)
5. [Database & Storage](#5-database--storage)
6. [Background Jobs & Queue](#6-background-jobs--queue)
7. [Authentication](#7-authentication)
8. [Hosting & Deployment](#8-hosting--deployment)
9. [Monitoring & Observability](#9-monitoring--observability)
10. [Developer Tooling](#10-developer-tooling)
11. [Dependency Map](#11-dependency-map)
12. [Environment Variables Reference](#12-environment-variables-reference)
13. [Free Tier Limits Reference](#13-free-tier-limits-reference)

---

## 1. Stack at a Glance

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                            │
│  React 18 · Vite · TypeScript · Tailwind CSS                        │
│  Hosted on: Firebase Hosting (free)                                  │
├─────────────────────────────────────────────────────────────────────┤
│  BACKEND / API                                                       │
│  FastAPI (Python 3.11) · Pydantic · Uvicorn                         │
│  Hosted on: Render.com free tier                                     │
├──────────────────────────┬──────────────────────────────────────────┤
│  AI / ML INFERENCE       │  BACKGROUND WORKERS                      │
│  DistilBERT (ONNX RT)    │  Celery + Redis Cloud                    │
│  EfficientNet-B0 (ONNX)  │  Report Generator                        │
│  Tesseract 5 OCR         │  LLM Caller (Groq API)                   │
│  Groq Llama 3.3 70B      │  PDF Renderer (WeasyPrint)               │
├──────────────────────────┴──────────────────────────────────────────┤
│  DATA LAYER                                                          │
│  Cloud Firestore · Firebase Storage · Redis Cloud                   │
├─────────────────────────────────────────────────────────────────────┤
│  AUTH                    │  MONITORING                              │
│  Firebase Authentication │  Sentry (free) · self-hosted Grafana     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend

### Core Framework

| Technology | Version | Purpose | Cost |
|---|---|---|---|
| **React** | 18.x | UI component framework | ₹0 (open source) |
| **Vite** | 5.x | Build tool & dev server | ₹0 (open source) |
| **TypeScript** | 5.x | Static typing | ₹0 (open source) |
| **Tailwind CSS** | 3.x | Utility-first styling | ₹0 (open source) |

### Key Libraries

| Library | Purpose |
|---|---|
| `firebase` (JS SDK) | Firestore real-time listeners, Auth, Storage uploads |
| `react-router-dom` v6 | Client-side routing |
| `react-query` (TanStack) | Server state management, polling for report job status |
| `react-hook-form` | Form handling (auth, SOS date picker) |
| `date-fns` | Date formatting and manipulation |
| `react-pdf` | Rendering PDF previews in browser (optional) |
| `axios` | HTTP client for FastAPI calls |

### Architecture Decisions

**Why React 18 + Vite over Next.js?**  
SafeSpeak's real-time data comes from Firestore listeners, not server-rendered pages. A plain React SPA avoids the SSR complexity overhead while Vite provides faster HMR during development.

**Why Tailwind over a component library (MUI/Chakra)?**  
Tailwind gives full design control without the bundle size cost of a full component library. This is important for a real-time app where JS bundle size directly affects time-to-interactive.

### Folder Structure

```
src/
├── components/
│   ├── auth/          # Login, Register forms
│   ├── chat/          # MessageBubble, ChatWindow, ImageMessage
│   ├── sos/           # SOSButton, DateRangePicker, ReportStatus
│   └── chatbot/       # ChatbotPanel, FileUploadZone
├── hooks/
│   ├── useAuth.ts     # Firebase auth state
│   ├── useMessages.ts # Firestore real-time listener
│   └── useReport.ts   # SOS job polling (react-query)
├── services/
│   ├── firebase.ts    # Firebase app init
│   ├── api.ts         # Axios instance for FastAPI
│   └── storage.ts     # Firebase Storage upload helpers
├── pages/
│   ├── Login.tsx
│   ├── Chat.tsx
│   └── Chatbot.tsx
└── types/
    └── index.ts       # Shared TypeScript interfaces
```

---

## 3. Backend & API

### Core Framework

| Technology | Version | Purpose | Cost |
|---|---|---|---|
| **Python** | 3.11 | Runtime | ₹0 (open source) |
| **FastAPI** | 0.110+ | Async REST API framework | ₹0 (open source) |
| **Uvicorn** | 0.29+ | ASGI server | ₹0 (open source) |
| **Pydantic** v2 | 2.x | Request/response validation & serialization | ₹0 (open source) |

### Key Libraries

| Library | Purpose |
|---|---|
| `firebase-admin` | Verify Firebase JWTs server-side, write to Firestore |
| `python-multipart` | Handle file uploads (images for OCR/CNN) |
| `httpx` | Async HTTP client for Groq API calls |
| `python-jose` | JWT decoding utilities |
| `slowapi` | Rate limiting middleware for FastAPI |
| `python-dotenv` | Environment variable management |

### API Structure

```
app/
├── main.py               # FastAPI app init, middleware, router registration
├── routers/
│   ├── auth.py           # JWT validation middleware
│   ├── messages.py       # POST /messages, POST /messages/image
│   ├── reports.py        # POST /reports/generate, GET /reports/status/{id}
│   └── chatbot.py        # POST /chatbot/analyze, POST /chatbot/message
├── services/
│   ├── inference.py      # DistilBERT + CNN inference wrappers
│   ├── ocr.py            # Tesseract OCR pipeline
│   ├── llm.py            # Groq API client + Gemini fallback
│   └── pdf.py            # WeasyPrint PDF generation
├── workers/
│   ├── celery_app.py     # Celery + Redis config
│   └── tasks.py          # report_generation_task, image_safety_task
├── models/
│   └── schemas.py        # Pydantic request/response models
└── core/
    ├── config.py         # Settings (env vars)
    ├── firebase.py       # Firebase Admin SDK init
    └── security.py       # JWT verification, rate limit helpers
```

### Architecture Decisions

**Why FastAPI over Flask/Django?**  
FastAPI is async-native, which is critical for SafeSpeak's architecture. Inference calls, Firestore writes, and Groq API calls all benefit from `async/await`. It also auto-generates OpenAPI docs and enforces Pydantic validation with zero boilerplate.

**Why Python 3.11 specifically?**  
Python 3.11 brings 10–60% speed improvements over 3.10, which matters for the inference engine running on free-tier CPU.

---

## 4. AI & ML Pipeline

### 4.1 Text Classification — DistilBERT

| Property | Detail |
|---|---|
| **Base Model** | `distilbert-base-uncased` (HuggingFace) |
| **Fine-tuning** | HatEval 2019 + UC Berkeley Measuring Hate Speech dataset |
| **Runtime** | ONNX Runtime (CPU) — exported from PyTorch |
| **Tokenizer** | `DistilBertTokenizerFast` (max 128 tokens) |
| **Output Classes** | `clean` · `offensive` · `hate_speech` · `threat` |
| **Target Latency** | < 100ms p95 on CPU |
| **Cost** | ₹0 — open source weights + self-hosted |

**Why ONNX Runtime over raw PyTorch?**  
ONNX Runtime achieves 2–4× faster inference than PyTorch on CPU by fusing operators and optimizing the computation graph. This is what makes sub-100ms latency feasible on a free-tier server.

**Fine-tuning Stack:**

```
transformers==4.40+
datasets==2.19+
torch==2.3+
onnx==1.16+
onnxruntime==1.18+
optimum==1.19+        # HuggingFace ONNX export helper
```

**Export Command:**
```bash
optimum-cli export onnx \
  --model ./fine-tuned-distilbert \
  --task text-classification \
  ./models/distilbert_onnx/
```

---

### 4.2 Image Safety — CNN NSFW Detector

| Property | Detail |
|---|---|
| **Architecture** | EfficientNet-B0 (fine-tuned) |
| **Task** | Binary classification: `safe` / `unsafe` |
| **Input** | 224 × 224 px, normalized RGB |
| **Runtime** | ONNX Runtime (CPU) or TorchScript |
| **Target Latency** | < 300ms p95 |
| **Cost** | ₹0 — open source model + self-hosted |

**Preprocessing Pipeline:**
```python
transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])
```

---

### 4.3 OCR Engine — Tesseract 5

| Property | Detail |
|---|---|
| **Engine** | Tesseract 5 (LSTM-based) via `pytesseract` |
| **Language Pack** | `eng` (English) |
| **Target Accuracy** | > 90% Character Error Rate (CER) |
| **Cost** | ₹0 — open source |

**Image Preprocessing Pipeline (OpenCV):**
```
Raw Image
    → Grayscale conversion
    → Gaussian blur (denoise)
    → Deskew (Hough transform angle detection)
    → Adaptive threshold (Otsu's binarization)
    → Tesseract LSTM inference
    → Regex post-processing (artifact cleanup)
```

**Key Libraries:**
```
pytesseract==0.3.10
opencv-python-headless==4.9+
Pillow==10.x
```

---

### 4.4 LLM — Report Generation & Chatbot

| Property | Detail |
|---|---|
| **Primary** | Groq API — `llama-3.3-70b-versatile` |
| **Fallback** | Google Gemini 1.5 Flash (`gemini-1.5-flash`) |
| **Last Resort** | Template-based PDF (no LLM) |
| **Free Limit** | Groq: 14,400 req/day · Gemini: 1M tokens/day |
| **Max Tokens** | 2,048 per report summary |
| **Cost** | ₹0 — both providers free at this scale |

**Why Groq over running Ollama locally?**  
Groq's free API delivers Llama 3.3 70B inference at ~500 tokens/second with no GPU required on our server. Ollama would require a GPU on the host, making it incompatible with Render's free CPU tier.

**Fallback Chain:**
```
Groq API (Llama 3.3 70B)
    → [if rate limited or down]
Gemini 1.5 Flash API
    → [if both unavailable after 3 retries]
Template-based PDF (structured without LLM summary)
```

**Libraries:**
```
groq==0.9+            # Official Groq Python SDK
google-generativeai   # Gemini SDK
```

---

### 4.5 PDF Generation

| Technology | Purpose | Cost |
|---|---|---|
| **WeasyPrint** | HTML/CSS → PDF rendering (primary) | ₹0 (open source) |
| **ReportLab** | Fallback programmatic PDF generation | ₹0 (open source) |

**Why WeasyPrint?**  
Reports are styled HTML templates rendered to PDF. WeasyPrint lets developers style the report with familiar CSS rather than ReportLab's canvas API, making the report layout easy to iterate on.

---

## 5. Database & Storage

### Cloud Firestore

| Property | Detail |
|---|---|
| **Type** | NoSQL document database with real-time listeners |
| **Provider** | Google Firebase (Spark free plan) |
| **Free Tier** | 50,000 reads / 20,000 writes / 1,000 deletes per day |
| **Offline Persistence** | Enabled on the client (IndexedDB) |
| **Cost** | ₹0 |

**Collections:**

```
/users/{userId}
/conversations/{conversationId}
/conversations/{conversationId}/messages/{messageId}
/reports/{reportId}
```

**Security Rules Philosophy:**  
Users can only read/write documents where their `uid` matches the `userId` or appears in the `participants` array. No cross-user data access is permitted.

---

### Firebase Storage

| Property | Detail |
|---|---|
| **Provider** | Google Firebase (Spark free plan) |
| **Free Tier** | 5GB storage · 1GB/day download |
| **Cost** | ₹0 |

**Storage Folder Structure:**

```
/images/pending/{userId}/{messageId}     ← Awaiting CNN review
/images/approved/{userId}/{messageId}    ← Cleared, shown to recipient
/reports/{userId}/{reportId}.pdf         ← Generated abuse reports
```

**Access Control:** All paths are protected by Firebase Storage Security Rules. PDFs are only accessible via server-generated signed URLs that expire after 24 hours.

---

### Redis Cloud

| Property | Detail |
|---|---|
| **Provider** | Redis Cloud (free tier) |
| **Free Tier** | 30MB RAM |
| **Usage** | Celery broker + result backend |
| **Cost** | ₹0 |

30MB is sufficient for queuing hundreds of background jobs simultaneously at MVP scale.

---

## 6. Background Jobs & Queue

| Technology | Version | Purpose | Cost |
|---|---|---|---|
| **Celery** | 5.x | Distributed task queue | ₹0 (open source) |
| **Redis Cloud** | — | Message broker + result store | ₹0 (free tier) |

### Task Definitions

| Task | Trigger | Description |
|---|---|---|
| `analyze_text_message` | On Firestore message write | Run DistilBERT, update `flagged` + `flagDetails` |
| `analyze_image_safety` | On image upload | Run CNN, move to approved/ or keep in pending/ |
| `generate_report` | SOS button click | Fetch messages → LLM summarize → render PDF → upload |

### Retry Policy

```python
@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,  # 5s → 15s → 45s (exponential)
    autoretry_for=(GroqAPIError, ConnectionError)
)
def generate_report(self, report_id: str): ...
```

---

## 7. Authentication

| Technology | Purpose | Cost |
|---|---|---|
| **Firebase Authentication** | Email/Password + Google OAuth | ₹0 (unlimited users on free plan) |
| **firebase-admin** (Python SDK) | Server-side JWT verification | ₹0 |

### Token Flow

```
1. User logs in via Firebase Auth SDK (client)
2. Firebase returns ID token (JWT, 1hr expiry)
3. Client stores token in memory (not localStorage)
4. Every API call sends: Authorization: Bearer <token>
5. FastAPI middleware calls firebase_admin.auth.verify_id_token()
6. Token is refreshed silently by Firebase SDK before expiry
```

### Password Security

Passwords are **never stored** in SafeSpeak's database. Firebase Authentication handles all credential storage using bcrypt hashing internally. SafeSpeak only stores `uid`, `displayName`, `email`, and `photoURL`.

---

## 8. Hosting & Deployment

### Frontend — Firebase Hosting

| Property | Detail |
|---|---|
| **Provider** | Firebase Hosting (Spark free plan) |
| **Free Tier** | 10GB storage · 360MB/day transfer |
| **Deploy Command** | `firebase deploy --only hosting` |
| **CDN** | Global CDN included |
| **SSL** | Auto-provisioned (HTTPS enforced) |
| **Cost** | ₹0 |

---

### Backend — Render.com

| Property | Detail |
|---|---|
| **Provider** | Render.com (free tier web service) |
| **Runtime** | Docker container (Python 3.11) |
| **Spin-down** | After 15min inactivity (cold start ~30s) |
| **RAM** | 512MB |
| **CPU** | Shared |
| **Cost** | ₹0 (upgrade to $7/mo to eliminate spin-down) |

**Render Start Command:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Keeping the Server Warm (Free Workaround):**  
Use a free cron ping service (e.g., cron-job.org) to hit `GET /health` every 10 minutes, preventing the free tier spin-down during active use.

---

### Containerization

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install Tesseract system dependency
RUN apt-get update && apt-get install -y tesseract-ocr

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml (local development)
services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [redis]

  worker:
    build: .
    command: celery -A app.workers.celery_app worker --loglevel=info
    env_file: .env
    depends_on: [redis]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

---

## 9. Monitoring & Observability

| Tool | Purpose | Cost |
|---|---|---|
| **Sentry** (Developer plan) | Error tracking, exception capture | ₹0 (5K errors/month) |
| **Grafana** (self-hosted) | Metrics dashboards | ₹0 (open source) |
| **Prometheus** (self-hosted) | Metrics collection from FastAPI | ₹0 (open source) |
| **FastAPI `/health`** | Load balancer health check endpoint | ₹0 |

### Key Metrics to Track

```
inference_latency_ms          # DistilBERT + CNN p50/p95/p99
report_generation_duration_s  # End-to-end SOS report time
celery_task_failure_rate      # % of tasks that exhaust retries
firestore_write_errors        # Failed message persistence events
groq_api_error_rate           # LLM availability tracking
```

---

## 10. Developer Tooling

| Tool | Purpose | Cost |
|---|---|---|
| **ESLint + Prettier** | Frontend code linting & formatting | ₹0 |
| **Ruff** | Python linter (replaces flake8 + isort) | ₹0 |
| **Black** | Python code formatter | ₹0 |
| **pytest** | Python unit & integration testing | ₹0 |
| **Vitest** | React component testing | ₹0 |
| **Locust** | Load testing (1,000 concurrent users) | ₹0 |
| **pre-commit** | Git hooks for lint/format on commit | ₹0 |

---

## 11. Dependency Map

```
User Request
    │
    ▼
React Frontend
    ├── Firebase Auth SDK ──────────────────► Firebase Auth (free)
    ├── Firestore SDK (real-time) ──────────► Cloud Firestore (free)
    ├── Firebase Storage SDK ───────────────► Firebase Storage (free)
    └── axios ──────────────────────────────► FastAPI on Render (free)
                                                  │
                              ┌───────────────────┼───────────────────┐
                              ▼                   ▼                   ▼
                       ONNX Runtime          Celery Worker       Tesseract OCR
                    (DistilBERT/CNN)       (Redis Cloud)         (local)
                              │                   │
                              ▼                   ▼
                       Firestore update     Groq API (free)
                                           → Gemini fallback (free)
                                           → WeasyPrint PDF
                                           → Firebase Storage (PDF upload)
```

---

## 12. Environment Variables Reference

```bash
# ── Firebase ──────────────────────────────────
FIREBASE_PROJECT_ID=safespeak-prod
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@safespeak.iam.gserviceaccount.com

# ── Redis (Redis Cloud) ───────────────────────
REDIS_URL=redis://default:<password>@<host>:<port>

# ── Groq API (Primary LLM) ───────────────────
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# ── Gemini API (Fallback LLM) ────────────────
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxx

# ── ML Models (local paths on server) ────────
DISTILBERT_ONNX_PATH=./models/distilbert_onnx/model.onnx
CNN_ONNX_PATH=./models/efficientnet_nsfw/model.onnx

# ── App Config ────────────────────────────────
ENVIRONMENT=production
CORS_ORIGINS=https://safespeak.web.app,http://localhost:5173
HATE_SPEECH_CONFIDENCE_THRESHOLD=0.85
MAX_IMAGE_SIZE_MB=10
REPORT_PDF_EXPIRY_HOURS=24
```

---

## 13. Free Tier Limits Reference

This table shows the hard limits of each free service and the expected usage at MVP scale (~100 DAU).

| Service | Free Limit | Expected MVP Usage | Headroom |
|---|---|---|---|
| Firestore Reads | 50,000/day | ~15,000/day | ✅ 3× headroom |
| Firestore Writes | 20,000/day | ~5,000/day | ✅ 4× headroom |
| Firebase Storage | 5GB | ~500MB | ✅ 10× headroom |
| Firebase Hosting Transfer | 360MB/day | ~50MB/day | ✅ 7× headroom |
| Groq API Requests | 14,400/day | ~500/day | ✅ 28× headroom |
| Gemini API Tokens | 1M tokens/day | ~100K/day | ✅ 10× headroom |
| Redis Cloud | 30MB | ~2MB | ✅ 15× headroom |
| Sentry Errors | 5,000/month | ~100/month | ✅ 50× headroom |
| Render.com RAM | 512MB | ~350MB | ⚠️ Watch model size |

> ⚠️ **Render RAM Note:** DistilBERT ONNX (~250MB) + EfficientNet ONNX (~20MB) + FastAPI overhead (~80MB) ≈ 350MB. This fits within the 512MB free tier limit but leaves little room. Ensure ONNX models are quantized (INT8) to reduce memory footprint before deployment.

---

*This document should be kept in sync with the PRD and updated whenever a technology decision changes.*
