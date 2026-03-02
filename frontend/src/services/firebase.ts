// ── SafeSpeak — Firebase Initialization ─────────────────────────────
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Enable Firestore offline persistence for zero message loss
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('[Firestore] Multiple tabs open — offline persistence disabled.');
    } else if (err.code === 'unimplemented') {
        console.warn('[Firestore] Browser does not support offline persistence.');
    }
});

// ── Push Notifications (FCM) ────────────────────────────────────────

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Request notification permission and get FCM token.
 * Returns the token string on success, or null if denied/unsupported.
 */
export async function requestNotificationPermission(): Promise<string | null> {
    try {
        const supported = await isSupported();
        if (!supported) {
            console.warn('[FCM] Push messaging not supported in this browser.');
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('[FCM] Notification permission denied.');
            return null;
        }

        const messaging = getMessaging(app);

        // Register the custom service worker for background messages
        const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: swRegistration,
        });

        if (token) {
            console.log('[FCM] Token obtained:', token.slice(0, 20) + '...');
            return token;
        }

        console.warn('[FCM] No token returned.');
        return null;
    } catch (err) {
        console.error('[FCM] Failed to get token:', err);
        return null;
    }
}

/**
 * Listen for foreground messages and show a toast notification.
 * Call this once after the app loads.
 */
export function onForegroundMessage(callback: (payload: { title: string; body: string; data?: Record<string, string> }) => void) {
    isSupported().then((supported) => {
        if (!supported) return;

        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
            console.log('[FCM] Foreground message:', payload);
            const title = payload.notification?.title || 'SafeSpeak';
            const body = payload.notification?.body || 'You have a new message';
            callback({ title, body, data: payload.data });
        });
    });
}
