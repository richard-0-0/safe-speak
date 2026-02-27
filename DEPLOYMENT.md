# SafeSpeak — Free Cloud Deployment Guide

This guide explains how to deploy the entire SafeSpeak stack for **free** using Render (Backend), Upstash (Redis), and Firebase Hosting (Frontend).

---

## Step 1: Push Code to GitHub
Both Render and Firebase require your code to be on GitHub.
1. Commit all recent changes.
2. Push your `master` branch to your GitHub repository.

---

## Step 2: Set Up Upstash Redis (Free)
Render's free tier doesn't include a persistent Redis instance, so we use Upstash.

1. Go to [Upstash.com](https://upstash.com/) and sign in with GitHub.
2. Click **Create Database** under the Redis section.
3. Give it a name (e.g., `safespeak-redis`), select your nearest region, and leave it on the **Free** tier.
4. Once created, scroll down to the **Connect** section.
5. Copy the **Redis URL** (it looks like `rediss://default:password@endpoint.upstash.io:6379`). Keep this handy.

---

## Step 3: Deploy Backend on Render (Free)
We have added a `render.yaml` file to make this one-click.

1. Go to [Render.com](https://render.com/) and sign in with GitHub.
2. Go to your Dashboard and click **New +** → **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` file and propose setting up the `safespeak-api` service.
5. Click **Apply**.
6. **IMPORTANT - Add Environment Variables**: 
   Render will deploy, but it will fail initially because it needs your secrets. Go to the newly created `safespeak-api` web service → **Environment** tab, and add the following:
   
   * Copy all your Firebase credentials from your local `.env`:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_PRIVATE_KEY` (Important: ensure newlines are preserved)
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_STORAGE_BUCKET`
   * Copy your LLM keys from local `.env`:
     - `GROQ_API_KEY`
     - `GEMINI_API_KEY`
   * Add your new Upstash Redis URL to **both** of these:
     - `REDIS_URL`: (paste Upstash URL here)
     - `CELERY_BROKER_URL`: (paste Upstash URL here)
     - `CELERY_RESULT_BACKEND`: (paste Upstash URL here)
   * Add the frontend URL (you'll get this in Step 4, for now use `*` or `http://localhost:5173`):
     - `CORS_ORIGINS`: `https://YOUR-FRONTEND-URL.web.app` (Update this later)

7. Render will now build the Docker image (this takes ~5 minutes as it bakes the ML model in).
8. Once live, copy your Render backend URL (e.g., `https://safespeak-api.onrender.com`).

---

## Step 4: Deploy Frontend on Firebase Hosting (Free)

1. Open your local terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Open the `frontend/.env` file and change `VITE_API_BASE_URL`:
   ```bash
   VITE_API_BASE_URL=https://safespeak-api.onrender.com  # Use your actual Render URL
   ```
3. Build the production version of the frontend:
   ```bash
   npm run build
   ```
4. Deploy to Firebase explicitly targeting hosting:
   ```bash
   firebase deploy --only hosting
   ```
5. Firebase will provide a Hosting URL (e.g., `https://safespeak-app.web.app`).
6. **Final Step**: Go back to Render Dashboard → `safespeak-api` → Environment variables, and update `CORS_ORIGINS` to your new Firebase frontend URL.

---

### Understanding the Free Tier Limitations
* **Cold Starts**: Render free instances spin down after 15 minutes of inactivity. When you open the app after a while, the *first* request may take 30-50 seconds as the container wakes up.
* **Model Loading**: Every time Render wakes up, DistilBERT takes ~10 seconds to load into memory.
* **Redis Limits**: Upstash free tier allows 10,000 commands/day. This is plenty for a staging app, but if it gets heavy usage, Celery tasks might exhaust it.
