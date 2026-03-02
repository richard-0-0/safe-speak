// ── SafeSpeak — Firebase Messaging Service Worker ───────────────────
// Handles push notifications when the app is in the background/closed.
// This file MUST be at the root of the public directory.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyCRkzbP7aT_yrSDnW2IXIP0HVE0mnLfbAQ',
    authDomain: 'safespeak-9ab11.firebaseapp.com',
    projectId: 'safespeak-9ab11',
    storageBucket: 'safespeak-9ab11.firebasestorage.app',
    messagingSenderId: '928622758702',
    appId: '1:928622758702:web:e017c1a2bd751568e9c8bf',
});

const messaging = firebase.messaging();

// Handle background messages
// Note: When the FCM payload contains a `notification` object (title/body),
// Firebase's SDK automatically displays a system notification.
// We only need this listener to handle custom data payloads or logging.
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);
});

// Handle notification click — open the app to the right conversation
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const conversationId = event.notification.data?.conversationId;
    const url = conversationId ? `/chat?c=${conversationId}` : '/chat';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Focus existing tab if open
            for (const client of windowClients) {
                if (client.url.includes('/chat') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open new tab
            return clients.openWindow(url);
        })
    );
});
