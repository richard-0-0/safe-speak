// ── SafeSpeak — Conversation List Component ─────────────────────────
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { api } from '@/services/api';
import { format } from 'date-fns';
import { MessageSquare, Plus, Search } from 'lucide-react';
import type { Conversation } from '@/types';

interface ConversationListProps {
    userId: string;
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
}

// Cache for resolved user profiles (UID → displayName or email)
const userProfileCache: Record<string, string> = {};

async function resolveUserNames(uids: string[]): Promise<Record<string, string>> {
    // Filter out already-cached UIDs
    const uncachedUids = uids.filter((uid) => !userProfileCache[uid]);

    if (uncachedUids.length > 0) {
        try {
            const response = await api.post('/api/auth/users/batch', { uids: uncachedUids });
            const users = response.data.users || {};

            for (const uid of uncachedUids) {
                if (users[uid]) {
                    const name = users[uid].displayName || users[uid].email || uid;
                    userProfileCache[uid] = name;
                } else {
                    userProfileCache[uid] = uid; // fallback
                }
            }
        } catch (err) {
            console.warn('[ConversationList] Batch user lookup failed:', err);
            // Fallback: cache as UID
            for (const uid of uncachedUids) {
                userProfileCache[uid] = uid;
            }
        }
    }

    const result: Record<string, string> = {};
    for (const uid of uids) {
        result[uid] = userProfileCache[uid] || uid;
    }
    return result;
}

function extractDate(ts: any): Date | null {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (ts instanceof Date) return ts;
    if (typeof ts === 'number') return new Date(ts);
    return null;
}

export function ConversationList({
    userId,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
}: ConversationListProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [userNames, setUserNames] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!userId) return;

        const q = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', userId)
        );


        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const convos = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Conversation[];

            convos.sort((a, b) => {
                const aTime = extractDate(a.lastMessage?.timestamp) || extractDate(a.createdAt) || new Date(0);
                const bTime = extractDate(b.lastMessage?.timestamp) || extractDate(b.createdAt) || new Date(0);
                return bTime.getTime() - aTime.getTime();
            });

            setConversations(convos);

            // Resolve all participant UIDs to display names
            const otherUids = convos
                .map((c) => c.participants?.find((p) => p !== userId))
                .filter((uid): uid is string => !!uid);

            const uniqueUids = [...new Set(otherUids)];
            const resolved = await resolveUserNames(uniqueUids);

            setUserNames((prev) => ({ ...prev, ...resolved }));
        });

        return () => unsubscribe();
    }, [userId]);

    // Filter conversations by search term
    const filteredConversations = conversations.filter((convo) => {
        if (!searchTerm.trim()) return true;
        const otherUid = convo.participants?.find((p) => p !== userId) || '';
        const name = userNames[otherUid] || otherUid;
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });


    return (
        <div className="h-full flex flex-col bg-navy-950 border-r border-surface-border">
            {/* Header */}
            <div className="p-4 border-b border-surface-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-display font-semibold text-white">Chats</h2>
                    <button
                        onClick={onNewConversation}
                        className="p-2 rounded-lg bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20 transition-colors"
                        title="New conversation"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field pl-10 py-2 text-sm"
                    />
                </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <MessageSquare className="w-12 h-12 text-white/10 mb-3" />
                        <p className="text-white/30 text-sm">
                            {searchTerm ? 'No matching conversations' : 'No conversations yet'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={onNewConversation}
                                className="mt-3 text-accent-teal text-sm hover:underline"
                            >
                                Start your first chat
                            </button>
                        )}
                    </div>
                ) : (
                    filteredConversations.map((convo) => {
                        const otherUid = convo.participants?.find((p) => p !== userId) || '';
                        const displayName = userNames[otherUid] || 'Loading...';
                        const lastMsg = convo.lastMessage;
                        const isActive = convo.id === activeConversationId;

                        const msgDate = extractDate(lastMsg?.timestamp);
                        const timestamp = msgDate ? format(msgDate, 'h:mm a') : '';

                        return (
                            <button
                                key={convo.id}
                                onClick={() => onSelectConversation(convo.id)}
                                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  transition-all duration-200 border-b border-surface-border/50
                  ${isActive
                                        ? 'bg-accent-teal/10 border-l-2 border-l-accent-teal'
                                        : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                                    }
                `}
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-teal/30 to-accent-blue/30 flex items-center justify-center flex-shrink-0">
                                    <span className="text-accent-teal font-display font-semibold text-sm">
                                        {displayName.charAt(0).toUpperCase()}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-white text-sm font-medium truncate">
                                            {displayName}
                                        </p>
                                        <span className="text-white/30 text-[10px] flex-shrink-0">{timestamp}</span>
                                    </div>
                                    {lastMsg && (
                                        <p className="text-white/40 text-xs truncate mt-0.5">
                                            {lastMsg.senderId === userId ? 'You: ' : ''}
                                            {lastMsg.content}
                                        </p>
                                    )}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
