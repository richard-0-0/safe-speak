# 🛡️ SafeSpeak

**A secure real-time messaging app that uses AI to automatically detect hate speech, offensive language, and threats.**

SafeSpeak lets you chat with friends and family while an AI model silently monitors messages for harmful content. If someone sends something toxic, the recipient sees a warning badge. You can also generate SOS reports (PDF) of flagged messages over a date range, and use the AI chatbot to analyze screenshots of conversations.

---

## 📁 Project Structure

```
safe-speak/
├── backend/             ← Python API server (FastAPI)
│   ├── app/
│   │   ├── core/        ← Config & Firebase setup
│   │   ├── routers/     ← API endpoint handlers
│   │   ├── services/    ← ML inference, LLM, OCR, PDF
│   │   └── workers/     ← Background job processing (Celery)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/            ← React web app (Vite + TypeScript)
│   ├── src/
│   │   ├── components/  ← Chat, Chatbot, Auth, SOS components
│   │   ├── pages/       ← Login, Chat, Chatbot pages
│   │   ├── hooks/       ← Custom React hooks
│   │   └── services/    ← API client & Firebase config
│   ├── public/          ← PWA icons & manifest
│   ├── index.html
│   ├── package.json
│   └── .env.example
│
├── models/              ← ML model files (not in Git)
├── firestore.rules      ← Firebase security rules
└── README.md            ← You are here!
```

---

## 🧠 How It Works (The Big Picture)

Here's what happens when you use SafeSpeak:

```
┌─────────────┐         ┌──────────────┐         ┌──────────────────┐
│  React App  │ ──────► │  FastAPI      │ ──────► │  Firebase        │
│  (Browser)  │ ◄────── │  Backend      │ ◄────── │  Firestore DB    │
└─────────────┘         └──────┬───────┘         └──────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              DistilBERT    Groq/      Celery
              (hate speech  Gemini     (background
               detection)   (chatbot)   PDF reports)
```

1. **You send a message** → the React frontend sends it to the FastAPI backend
2. **Backend runs AI** → a DistilBERT model checks if the message is hateful/offensive/threatening
3. **Message stored** → the message is saved in Firebase Firestore with a flag if it's harmful
4. **Recipient sees warning** → if the message was flagged, the recipient sees a colored badge (e.g., "Hate Speech 92%")
5. **SOS Reports** → you can generate a PDF report of all flagged messages in a date range (processed in background by Celery)
6. **AI Chatbot** → you can paste or upload screenshots and the AI will analyze them for harmful content

---

## 🔧 What You Need Before Starting

Make sure you have these installed on your computer:

| Tool | Version | How to check | Download link |
|------|---------|--------------|---------------|
| **Node.js** | 18 or newer | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | 9 or newer | `npm --version` | Comes with Node.js |
| **Python** | 3.10 or 3.11 | `python --version` | [python.org](https://www.python.org/downloads/) |
| **pip** | Latest | `pip --version` | Comes with Python |
| **Git** | Any | `git --version` | [git-scm.com](https://git-scm.com/) |
| **Redis** | 7+ | `redis-cli ping` | [redis.io](https://redis.io/download) (or use Docker / Redis Cloud) |
| **Tesseract OCR** | 5+ | `tesseract --version` | [github.com/tesseract-ocr](https://github.com/tesseract-ocr/tesseract) |

### Accounts You Need (All Free)

1. **Firebase** — for user login and database → [console.firebase.google.com](https://console.firebase.google.com/)
2. **Groq** — for the AI chatbot → [console.groq.com](https://console.groq.com/) (free API key)
3. **Google AI Studio** — for backup chatbot → [aistudio.google.com](https://aistudio.google.com/) (free Gemini API key)
4. **Redis Cloud** (optional) — if you don't want to run Redis locally → [redis.com/try-free](https://redis.com/try-free/)

---

## 🔥 Firebase Setup

This is the most important part. SafeSpeak uses Firebase for:
- **Authentication** (user login/signup with email or Google)
- **Firestore** (real-time message database)
- **Storage** (for uploaded images and PDF reports)

### Step-by-step:

1. Go to [console.firebase.google.com](https://console.firebase.google.com/)
2. Click **"Add project"** → name it something like `safespeak` → click Continue
3. Disable Google Analytics (you don't need it) → click **Create Project**
4. Once created, click the **gear icon ⚙️** → **Project settings**

#### Enable Authentication
1. In the left sidebar, click **Build → Authentication**
2. Click **Get Started**
3. Go to the **Sign-in method** tab
4. Enable **Email/Password** → toggle it ON → Save
5. Enable **Google** → toggle it ON → pick your email as support email → Save

#### Create Firestore Database
1. In the left sidebar, click **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll add security rules later)
4. Pick a region close to you → click **Enable**

#### Enable Storage
1. In the left sidebar, click **Build → Storage**
2. Click **Get Started** → **Start in test mode** → pick same region → click **Done**

#### Get Your Frontend Config
1. Go to **Project settings → General**
2. Scroll down to **"Your apps"** → click the web icon `</>`
3. Register your app (name: "SafeSpeak Frontend")
4. You'll see a config object like this — copy these values:
   ```
   apiKey: "AIzaSy..."
   authDomain: "safespeak-xxxxx.firebaseapp.com"
   projectId: "safespeak-xxxxx"
   storageBucket: "safespeak-xxxxx.appspot.com"
   messagingSenderId: "123456789"
   appId: "1:123456789:web:abc123"
   ```

#### Get Your Backend Service Account Key
1. Go to **Project settings → Service accounts**
2. Click **Generate new private key** → download the JSON file
3. Open the JSON file and find these three values:
   - `project_id`
   - `private_key` (the long string starting with `-----BEGIN RSA PRIVATE KEY-----`)
   - `client_email`

#### Deploy Firestore Security Rules
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase login` and sign in
3. From the project root directory, run:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 🖥️ Part 1: Setting Up the Backend (Python API)

The backend is a **Python FastAPI server** that:
- Receives messages and runs the hate-speech AI model on them
- Stores messages in Firebase Firestore
- Provides the AI chatbot (via Groq/Gemini APIs)
- Generates SOS PDF reports in the background (via Celery + Redis)
- Handles image OCR (reads text from screenshots)

### Step 1: Open a Terminal in the Backend Folder

```bash
cd backend
```

### Step 2: Create a Virtual Environment

A virtual environment keeps your Python packages separate from other projects.

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` at the beginning of your terminal line. This means it's working!

### Step 3: Install Python Packages

```bash
pip install -r requirements.txt
```

⏳ This will take a few minutes because it downloads the AI model libraries (PyTorch, etc.).

> **Troubleshooting:** If you get errors about `torch`, try installing the CPU-only version:
> ```bash
> pip install torch==2.3.0 --index-url https://download.pytorch.org/whl/cpu
> pip install -r requirements.txt
> ```

### Step 4: Set Up the Environment Variables

1. Copy the example file:
   ```bash
   # Windows
   copy .env.example .env

   # Mac/Linux
   cp .env.example .env
   ```

2. Open `.env` in a text editor and fill in your values:

   ```env
   # ── Firebase (from your Service Account JSON) ──
   FIREBASE_PROJECT_ID=safespeak-xxxxx
   FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@safespeak-xxxxx.iam.gserviceaccount.com
   FIREBASE_STORAGE_BUCKET=safespeak-xxxxx.firebasestorage.app

   # ── Redis ──
   REDIS_URL=redis://localhost:6379
   # Or if using Redis Cloud:
   # REDIS_URL=redis://default:yourpassword@redis-12345.c1.us-east.cloud.redislabs.com:12345

   # ── AI API Keys ──
   GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
   GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxx

   # ── ML Model Paths ──
   DISTILBERT_MODEL_DIR=./ml_models/distilbert
   CNN_ONNX_PATH=./ml_models/efficientnet/model.onnx

   # ── App Config ──
   ENVIRONMENT=development
   CORS_ORIGINS=http://localhost:5173
   ```

### Step 5: Get the ML Model Files

The DistilBERT model files need to be placed in `backend/ml_models/distilbert/`. You need these files:
- `model.onnx` (the AI model)
- `config.json` (model configuration)
- `tokenizer.json` and related tokenizer files

> Ask the project maintainer for the model files, or train your own using the DistilBERT fine-tuning scripts.

### Step 6: Start Redis

**Option A — Docker (easiest):**
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**Option B — Redis Cloud:**
Sign up at [redis.com/try-free](https://redis.com/try-free/) and get a connection URL. Put it in your `.env` as `REDIS_URL`.

**Option C — Install locally:**
Follow [redis.io/docs/install](https://redis.io/docs/install/) for your OS.

### Step 7: Start the Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     [SafeSpeak] Firebase initialized.
INFO:     [SafeSpeak] DistilBERT model loaded.
```

✅ **Test it:** Open your browser and go to `http://localhost:8000/health` — you should see:
```json
{"status": "ok", "model_loaded": true, "version": "2.0.0"}
```

### Step 8: Start the Celery Worker (For SOS Reports)

Open a **second terminal** (keep the backend server running in the first one):

```bash
cd backend
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

celery -A app.workers.celery_app worker --loglevel=info --concurrency=2
```

This worker processes SOS report generation in the background.

---

## 💻 Part 2: Setting Up the Frontend (React App)

The frontend is a **React + TypeScript web app** built with Vite. It includes:
- Login / Registration with Firebase Auth (email + Google)
- Real-time chat with message flagging
- AI Chatbot for analyzing messages and screenshots
- SOS Report generation
- Mobile-responsive design with PWA support

### Step 1: Open a Terminal in the Frontend Folder

```bash
cd frontend
```

### Step 2: Install Node Packages

```bash
npm install
```

⏳ This takes about 1–2 minutes.

### Step 3: Set Up the Environment Variables

1. Copy the example file:
   ```bash
   # Windows
   copy .env.example .env

   # Mac/Linux
   cp .env.example .env
   ```

2. Open `.env` and fill in your Firebase config (from the Firebase web app config you copied earlier):

   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=safespeak-xxxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=safespeak-xxxxx
   VITE_FIREBASE_STORAGE_BUCKET=safespeak-xxxxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   VITE_API_BASE_URL=http://localhost:8000
   ```

   > **Important:** `VITE_API_BASE_URL` should point to wherever your backend is running. For local development, it's `http://localhost:8000`.

### Step 4: Start the Development Server

```bash
npm run dev
```

You should see:
```
  VITE v7.3.1  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

✅ **Open your browser** and go to `http://localhost:5173` — you should see the SafeSpeak login page!

### Step 5: Create an Account and Start Chatting

1. Click **"Create one"** to make a new account
2. Enter your name, email, and password
3. Or click **"Continue with Google"** to sign in with Google
4. You're in! Start a new conversation by clicking the **chats icon** in the top bar

---

## 🐳 Docker Setup (Alternative — Run Everything at Once)

If you prefer Docker, you can run the backend, worker, and Redis all together:

```bash
cd backend
```

1. Make sure your `.env` file is set up (see Step 4 in Backend setup above)
2. Make sure ML model files are in `../models/models/` (one level above the backend folder)
3. Run:

```bash
docker-compose up --build
```

This starts:
- **API server** on `http://localhost:8000`
- **Celery worker** for background jobs
- **Redis** on port 6379

Then set up the frontend separately (Steps 1–4 in Part 2 above).

---

## 📱 Mobile & PWA

SafeSpeak is fully mobile-responsive and works as a **Progressive Web App (PWA)**:

- **On your phone's browser:** Open `http://your-server:5173` and use it like a regular website — everything is touch-friendly
- **Install as an app:** Your browser will show an "Install" or "Add to Home Screen" prompt. This installs SafeSpeak as a standalone app with its own icon

To test PWA features locally:
```bash
cd frontend
npm run build
npm run preview
```
Then open `http://localhost:4173` and check Chrome DevTools → Application → Manifest.

---

## 🗂️ API Endpoints

| Method | Endpoint | What It Does |
|--------|----------|--------------|
| `GET` | `/health` | Check if the server is running |
| `POST` | `/api/auth/register` | Create a new user account |
| `POST` | `/api/auth/conversations` | Start a new conversation |
| `POST` | `/api/auth/users/batch` | Look up user profiles by ID |
| `POST` | `/api/messages` | Send a text message (AI scans it) |
| `POST` | `/api/messages/image` | Send an image message |
| `POST` | `/api/reports/sos` | Generate an SOS report (PDF) |
| `GET` | `/api/reports/sos/{id}` | Check report generation status |
| `POST` | `/api/chatbot/analyze` | Ask the AI chatbot to analyze text |
| `POST` | `/api/chatbot/analyze-image` | Upload a screenshot for AI analysis |

Full API docs available at `http://localhost:8000/docs` (auto-generated by FastAPI).

---

## 🧪 Common Issues & Fixes

### "Module not found" errors in Python
Make sure your virtual environment is activated:
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### "CORS error" in the browser
Make sure `CORS_ORIGINS` in `backend/.env` matches your frontend URL exactly:
```env
CORS_ORIGINS=http://localhost:5173
```

### Backend starts but model isn't loading
Check that your ML model files exist at the paths specified in `.env`:
```env
DISTILBERT_MODEL_DIR=./ml_models/distilbert
```

### Redis connection refused
Make sure Redis is running:
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Firebase "permission denied" errors
Deploy the Firestore security rules:
```bash
firebase deploy --only firestore:rules
```

### Frontend shows blank page
Check the browser console (F12 → Console tab) for errors. Most likely:
- Missing `.env` variables → check all `VITE_` values are filled in
- Backend not running → make sure `http://localhost:8000/health` works

---

## 📦 Building for Production

### Frontend
```bash
cd frontend
npm run build
```
This creates a `dist/` folder with optimized files. Deploy to any static hosting (Firebase Hosting, Vercel, Netlify, etc.).

### Backend
```bash
cd backend
docker-compose up --build -d
```
Or deploy manually with:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 👥 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Icons | Lucide React |
| Auth | Firebase Authentication |
| Database | Firebase Firestore (real-time) |
| File Storage | Firebase Storage |
| Backend API | FastAPI (Python 3.11) |
| AI Model | DistilBERT (ONNX Runtime) |
| Chatbot LLM | Groq (primary) + Google Gemini (fallback) |
| Image OCR | Tesseract + OpenCV |
| PDF Reports | WeasyPrint |
| Background Jobs | Celery + Redis |
| Monitoring | Sentry |
| Containerization | Docker + Docker Compose |

---

## 📄 License

This project is for educational and research purposes.
