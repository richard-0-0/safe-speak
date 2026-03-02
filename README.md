---
title: SafeSpeak API
emoji: 🛡️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# 🛡️ SafeSpeak

**A secure real-time messaging app that uses AI to automatically detect hate speech, offensive language, and threats.**

SafeSpeak lets you chat with friends and family while an AI model silently monitors messages for harmful content. If someone sends something toxic, the recipient sees a warning badge. You can also generate SOS reports (PDF) of flagged messages over a date range, and use the AI chatbot to analyze screenshots of conversations.

---

## 🚀 Hugging Face Deployment (Current)

This repository is configured for deployment on **Hugging Face Spaces**.
- **RAM**: 16GB (Free Tier)
- **Port**: 7860
- **Dockerfile**: Located at the root.

To set up your own Space, follow the instructions in the [walkthrough](file:///C:/Users/Deepak%20Antony/.gemini/antigravity/brain/f8ff4f21-52fd-4e64-bdd9-92dc269e451b/walkthrough.md).

---

## 📁 Project Structure

```
safe-speak/
├── backend/             ← Python API server (FastAPI)
│   ├── app/
│   ├── Dockerfile.local  ← For local development
│   ├── Dockerfile.render ← For Render.com
│   ├── docker-compose.yml
│   └── ...
├── frontend/            ← React web app
├── models/              ← ML model files
├── Dockerfile           ← Primary Production Dockerfile (HF)
├── .dockerignore        ← Build exclusions for HF
└── README.md            ← You are here!
```

---

## 🧠 How It Works (The Big Picture)

... [rest of the original content] ...
