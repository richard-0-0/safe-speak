// ── SafeSpeak — Auth Hook ───────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
    type User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, requestNotificationPermission } from '@/services/firebase';
import { api } from '@/services/api';
import type { User } from '@/types';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Listen to Firebase auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser({
                    uid: firebaseUser.uid,
                    displayName: firebaseUser.displayName || 'User',
                    email: firebaseUser.email || '',
                    photoURL: firebaseUser.photoURL || undefined,
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Sync user profile to Firestore via backend and register FCM token
    const syncProfile = useCallback(async (firebaseUser: FirebaseUser) => {
        try {
            await api.post('/api/auth/profile', {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || 'User',
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || null,
            });

            // After login/sync, request notification permission
            const fcmToken = await requestNotificationPermission();
            if (fcmToken) {
                await api.post('/api/auth/fcm-token', { token: fcmToken });
                console.log('[Auth] FCM token registered for push notifications');
            }
        } catch (err) {
            console.warn('[Auth] Profile sync or token registration failed:', err);
        }
    }, []);

    const loginWithEmail = useCallback(async (email: string, password: string) => {
        setError(null);
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await syncProfile(result.user);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Login failed';
            setError(message.replace('Firebase: ', ''));
            throw err;
        }
    }, [syncProfile]);

    const registerWithEmail = useCallback(async (
        email: string,
        password: string,
        displayName: string
    ) => {
        setError(null);
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(result.user, { displayName });
            await syncProfile(result.user);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Registration failed';
            setError(message.replace('Firebase: ', ''));
            throw err;
        }
    }, [syncProfile]);

    const loginWithGoogle = useCallback(async () => {
        setError(null);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            if (result.user) {
                await syncProfile(result.user);
            }
        } catch (err: any) {
            if (err?.code === 'auth/popup-closed-by-user') {
                return; // Ignore if user simply closed the window
            }
            const message = err instanceof Error ? err.message : 'Google sign-in failed';
            setError(message.replace('Firebase: ', ''));
            throw err;
        }
    }, [syncProfile]);

    const logout = useCallback(async () => {
        await signOut(auth);
        setUser(null);
    }, []);

    return {
        user,
        loading,
        error,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
    };
}
