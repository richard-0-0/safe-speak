// ── SafeSpeak — TypeScript Interfaces ───────────────────────────────
// Firestore data contracts. Never deviate from these schemas.

import { Timestamp } from 'firebase/firestore';

export type FirestoreTimestamp = Timestamp;

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    type: 'text' | 'image';
    content: string;
    timestamp: FirestoreTimestamp;
    flagged: boolean;
    flagDetails?: {
        label: 'clean' | 'offensive' | 'hate_speech' | 'threat' | 'flagged';
        confidence: number;
        processedAt: string;
    };
    imageBlurred: boolean;
    readBy?: string[];
    deleted?: boolean;
    deletedAt?: FirestoreTimestamp;
    deletedBy?: string;
    edited?: boolean;
    editedAt?: FirestoreTimestamp;
    originalContent?: string;
}

export interface Conversation {
    id: string;
    participants: string[];
    createdAt: FirestoreTimestamp;
    lastMessage?: {
        content: string;
        senderId: string;
        timestamp: FirestoreTimestamp;
    };
}

export interface Report {
    id: string;
    userId: string;
    conversationId: string;
    dateRange: { start: string; end: string };
    jobId: string;
    status: 'queued' | 'processing' | 'complete' | 'failed';
    downloadUrl?: string;
    expiresAt?: string;
    createdAt: FirestoreTimestamp;
    messageCount: number;
    flaggedCount: number;
}

export interface User {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
}

export interface ChatbotAnalyzeResponse {
    extractedText: string;
    classification: {
        label: 'clean' | 'offensive' | 'hate_speech' | 'threat';
        confidence: number;
        processedAt: string;
    };
    chatbotResponse: string;
    sessionId: string;
}

export interface ChatbotMessage {
    role: 'user' | 'assistant';
    content: string;
    type?: 'text' | 'image_analysis';
    classification?: {
        label: string;
        confidence: number;
    };
}
