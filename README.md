---
title: SafeSpeak API
emoji: 🛡️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# 🛡️ SafeSpeak

**A secure, AI-powered real-time messaging platform designed to automatically detect and intercept hate speech, offensive language, and threats.**

SafeSpeak isn't just another chat app—it's a "safe space" by design. As users chat, a fine-tuned Machine Learning model silently analyzes messages in the background. If toxic content is detected, the system immediately flags it, sub-classifies the abuse type using a Large Language Model (Hate Speech, Threat, etc.), and alerts both users.

---

## ✨ Core Features

- **⚡ Real-Time Messaging**: Built on Firebase Cloud Firestore for instant, zero-latency communication with offline persistence.
- **🛡️ AI Content Moderation**: Uses a highly-optimized `DistilBERT` model running on ONNX Runtime to instantly classify messages as clean or flagged, all heavily parallelized.
- **🤖 Support Chatbot**: An integrated AI assistant. Upload screenshots of abuse, and the system uses Tesseract OCR to extract text, followed by Llama-3 (via Groq) to provide supportive, contextual advice.
- **🚨 SOS Reports**: Victims of abuse can generate comprehensive, stylized PDF reports containing all flagged messages over a specific date range—perfect for HR, legal, or school documentation.
- **🔔 Push Notifications**: Fully integrated Firebase Cloud Messaging (FCM) service workers deliver real-time background alerts for new messages and flagged content.
- **💅 Modern UI**: A responsive, mobile-first interface designed with Tailwind CSS, featuring light/dark themes, glassmorphism, and iOS safe-area handling.

---

## 🏗️ Architecture Overview

SafeSpeak uses a modern, decoupled architecture:

1. **Frontend (React + Vite)**: Handles the UI, Firebase Auth, real-time Firestore listeners, and Push Notification service workers.
2. **Backend (FastAPI)**: Serves as the central nervous system. Authenticates users via Firebase Admin, handles API requests, and dispatches background tasks.
3. **Queue (Celery + Redis)**: AI inference and PDF generation are computationally expensive. The backend offloads these tasks to asynchronous Celery workers to keep the API blazing fast.
4. **Cloud Database (Firebase)**: Firestore holds the live chat data, while Firebase Storage handles image uploads and PDF report downloads.

*For a deep dive into the architecture and data flow, check out [Working.md](docs/Working.md).*

---

## �️ Tech Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query |
| **Backend** | Python 3.11, FastAPI, Firebase Admin SDK |
| **Database/Auth** | Google Cloud Firestore, Firebase Auth, Firebase Storage |
| **Machine Learning** | DistilBERT (ONNX Runtime) |
| **LLM & OCR** | Groq (Llama 3 70B), Gemini 1.5 Flash, Tesseract OCR |
| **Background Tasks** | Celery, Redis (Upstash) |
| **PDF Generation** | WeasyPrint |

---

## 🚀 Getting Started (Local Development)

The easiest way to run the full stack locally is using Docker Compose.

### 1. Prerequisites
- Docker and Docker Compose installed.
- A Firebase Project with Auth, Firestore, and Storage enabled.
- API Keys for Groq and/or Google Gemini.

### 2. Environment Variables
Create a `.env` file in both the `frontend/` and `backend/` directories. Refer to the specific frontend and backend documentation for the required variables.

### 3. Run the App
From the root directory, start the backend API, Celery worker, and Redis broker:
```bash
docker-compose up --build
```
Then, in a separate terminal, start the frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Deployment

SafeSpeak is designed to be deployed across two platforms to maximize free-tier capabilities:
- **Frontend**: [Firebase Hosting](https://firebase.google.com/docs/hosting) (Global CDN).
- **Backend & Workers**: [Hugging Face Spaces](https://huggingface.co/docs/hub/spaces) (Docker Space with 16GB RAM) + Upstash Serverless Redis.

*(Note: The `Dockerfile` at the root of this repository is specifically configured to load the backend into Hugging Face Spaces.)*

---

## 📚 Documentation Directory

Want to learn more? Check out the detailed documentation carefully maintained in the `docs/` folder:

- 📖 **[Application Working (Overview)](docs/Working.md)**
- 🖥️ **[Frontend Architecture](docs/frontend.md)**
- ⚙️ **[Backend & ML Architecture](docs/backend.md)**
- 📋 **[Product Requirements (PRD)](docs/PRD.md)**
- 🚀 **[Deployment Guide](markdowns/DEPLOYMENT.md)**
