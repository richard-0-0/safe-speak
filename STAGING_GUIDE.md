# SafeSpeak v2.0 — Staging & Deployment Guide

This guide will walk you through the steps required to deploy the SafeSpeak v2.0 application, including both the backend API and the frontend client.

## 1. Firebase Project Setup
SafeSpeak uses Firebase for Authentication, Cloud Firestore (Database), and Cloud Storage (File storage).

For comprehensive, step-by-step instructions on setting up the Firebase project, enabling the correct services, and generating the necessary credentials, **please refer to the [Detailed Firebase Setup Guide](FIREBASE_SETUP.md) (`FIREBASE_SETUP.md`)**.

Once Firebase is fully configured, proceed to section 2.

## 2. Environment Variables

### Backend (`/backend/.env`)
Copy `.env.example` to `.env` in the `backend/` directory:
```bash
cp /backend/.env.example /backend/.env
```
Fill in the following variables:
- `FIREBASE_CREDENTIALS`: Path to your downloaded Firebase Service Account JSON file.
- `GROQ_API_KEY` & `GEMINI_API_KEY`: API keys for the LLM fallback chain.
- `REDIS_URL`: URL for your Redis Cloud or local Redis instance (for Celery).
- `SENTRY_DSN` (Optional): For error tracking.

### Frontend (`/frontend/.env`)
Create a `.env` file in the `frontend/` directory with your Firebase config:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=http://localhost:8000
```

## 3. Backend Deployment

### Local Development
To run the backend locally, you will need a virtual environment, dependencies, and OS-level libraries (for PDF rendering/OCR).
1. Ensure `tesseract-ocr`, `tesseract-ocr-eng`, and WeasyPrint dependencies are installed via your OS package manager (`apt`, `brew`, etc.).
2. Set up the Python virtual environment:
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
```
3. Start the FastAPI server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
4. Start the Celery Worker (In a separate terminal):
```bash
celery -A app.workers.celery_app worker --loglevel=info
```

### Docker/Production Flow (Recommended)
You can build and run the provided Docker image, which automatically installs all system dependencies (Python, Tesseract, WeasyPrint).
```bash
cd backend
docker-compose up -d --build
```
This will start both the API and the Celery worker concurrently.

## 4. Frontend Deployment

### Local Development
```bash
cd frontend
npm install
npm run dev
```
The app will be available at `http://localhost:5173`. Make sure the backend URL in `.env` is correct.

### Production Build
Build the distribution files:
```bash
npm run build
```
The optimized static build will output to `frontend/dist`. You can deploy this folder directly to static hosting services like Vercel, Netlify, or Firebase Hosting.

## 5. Verification Checklist
- [ ] Users can register and login.
- [ ] Real-time messages sync correctly between two clients.
- [ ] The `health` API endpoint (`/health`) reports that the AI model loaded successfully.
- [ ] Generate an SOS report and verify that the WeasyPrint PDF is correctly created and uploaded to Firebase Storage.
