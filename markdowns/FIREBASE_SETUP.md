# SafeSpeak v2.0 — Detailed Firebase Setup Guide

This guide provides step-by-step instructions for creating and configuring the Firebase project required for SafeSpeak v2.0.

## 1. Create a New Firebase Project

1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Create a project** (or **Add project**).
3. Enter the project name: `SafeSpeak`. Check the confirmation boxes and click **Continue**.
4. You will be prompted to enable Google Analytics. This is optional; you can disable it for local development, then click **Create project**.
5. Wait for the provisioning to finish, then click **Continue** to access your new Project Dashboard.

## 2. Configure Authentication

SafeSpeak requires both Email/Password and Google OAuth authentication methods.

1. In the left sidebar, expand the **Build** menu and select **Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
   - Toggle the **Enable** switch to **On**.
   - Click **Save**.
4. Click **Add new provider** and select **Google**.
   - Toggle the **Enable** switch to **On**.
   - Provide a support email from the dropdown.
   - Click **Save**.

## 3. Set Up Cloud Firestore (Database)

1. In the left sidebar under **Build**, select **Firestore Database**.
2. Click **Create database**.
3. You will be prompted regarding Security Rules. Select **Start in production mode** and click **Next**.
4. Choose a geographic location for your database (e.g., `nam5 (us-central)`). *Note: This cannot be changed later.* Click **Enable**.
5. Once the database is created, go to the **Rules** tab.
6. Open the `firestore.rules` file located in the root of your SafeSpeak codebase.
7. Replace the default rules in the Firebase console with the contents of your `firestore.rules` file.
8. Click **Publish**.

## 4. Set Up Cloud Storage (Files & Images)

1. In the left sidebar under **Build**, select **Storage**.
2. Click **Get started**.
3. Similar to Firestore, select **Start in production mode** and click **Next**.
4. Choose the same geographic location you selected for Firestore and click **Done**.
5. Once your storage bucket is ready, navigate to the **Rules** tab.
6. Replace the default rules with the following basic authenticated access rules (or more restrictive rules if preferred):
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
7. Click **Publish**.

## 5. Generate Backend Service Account Key

The FastAPI backend requires admin access to Firebase to issue custom tokens and perform trusted database operations.

1. Click the **Gear icon** (Project settings) in the top-left sidebar, next to "Project Overview", and select **Project settings**.
2. Navigate to the **Service accounts** tab.
3. Keep the default selection (Node.js/Python) and click the **Generate new private key** button.
4. Confirm by clicking **Generate key**.
5. A JSON file will download to your computer. Move this file to a secure, non-public location on your backend server or local machine (e.g., `backend/firebase-credentials.json`).
6. **IMPORTANT:** Never commit this JSON file to version control (Git). Ensure it is listed in your `.gitignore`.
7. You will use the absolute path to this file as the `FIREBASE_CREDENTIALS` environment variable in your backend `.env` file.

## 6. Register Web App for the Frontend

The React/Vite frontend needs public configuration keys to connect to Firebase services.

1. Go back to **Project settings** > **General** tab.
2. Scroll down to the **Your apps** section. If there are no apps, click the web icon (`</>`) to add a new web app.
3. Enter an App nickname (e.g., `SafeSpeak Web`). You do not need to set up Firebase Hosting at this moment.
4. Click **Register app**.
5. You will be presented with a `firebaseConfig` object in the code snippet. It looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyDoNotShareThisKey...",
     authDomain: "safespeak-xyz.firebaseapp.com",
     projectId: "safespeak-xyz",
     storageBucket: "safespeak-xyz.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123def456"
   };
   ```
6. Copy these corresponding values into your `frontend/.env` file:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   VITE_FIREBASE_PROJECT_ID=your_project_id_here
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
   VITE_FIREBASE_APP_ID=your_app_id_here
   ```
7. Click **Continue to console**.

You have now successfully configured Firebase for SafeSpeak! Proceed to the next steps in the `STAGING_GUIDE.md` to start the backend and frontend.
