// ── SafeSpeak — Messages Hook (Firestore Real-Time Listener) ────────
import { useEffect, useState } from 'react';
import {
    collection, query, orderBy, limit,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { Message } from '@/types';

export function useMessages(conversationId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!conversationId) return;

        const q = query(
            collection(db, 'conversations', conversationId, 'messages'),
            orderBy('timestamp', 'asc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Message[];
            setMessages(msgs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [conversationId]);

    return { messages, loading };
}
