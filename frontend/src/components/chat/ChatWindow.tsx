// ── SafeSpeak — Chat Window Component ───────────────────────────────
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ImagePlus, Loader2, ArrowLeft } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useMessages } from '@/hooks/useMessages';
import { api } from '@/services/api';
import { MessageBubble } from './MessageBubble';
import { ImageMessage } from './ImageMessage';
import { SOSButton } from '@/components/sos/SOSButton';
import type { User } from '@/types';

interface ChatWindowProps {
    conversationId: string;
    currentUser: User;
    onBack?: () => void; // mobile: go back to conversation list
}

// Cache resolved participant names
const participantCache: Record<string, string> = {};

export function ChatWindow({ conversationId, currentUser, onBack }: ChatWindowProps) {
    const { messages, loading } = useMessages(conversationId);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [participantName, setParticipantName] = useState<string>('Conversation');
    const [onlineStatus, setOnlineStatus] = useState<'online' | 'away'>('away');
    const [keyboardOffset, setKeyboardOffset] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputBarRef = useRef<HTMLDivElement>(null);

    // ── Mobile virtual keyboard handling ──
    // Uses the Visual Viewport API to detect when the keyboard opens
    // and adjusts the input bar position to stay above it.
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const handleResize = () => {
            // The difference between window height and visual viewport height
            // is approximately the keyboard height
            const offsetFromBottom = window.innerHeight - vv.height - vv.offsetTop;
            setKeyboardOffset(Math.max(0, offsetFromBottom));
        };

        vv.addEventListener('resize', handleResize);
        vv.addEventListener('scroll', handleResize);
        return () => {
            vv.removeEventListener('resize', handleResize);
            vv.removeEventListener('scroll', handleResize);
        };
    }, []);

    // Scroll to bottom when keyboard offset changes
    useEffect(() => {
        if (keyboardOffset > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [keyboardOffset]);

    // Resolve participant name and online status from conversation document
    useEffect(() => {
        if (!conversationId) return;

        let otherUidRef = '';

        const resolveParticipant = async () => {
            try {
                const convoDoc = await getDoc(doc(db, 'conversations', conversationId));
                if (convoDoc.exists()) {
                    const participants: string[] = convoDoc.data().participants || [];
                    const otherUid = participants.find((p) => p !== currentUser.uid);
                    if (otherUid) {
                        otherUidRef = otherUid;
                        if (participantCache[otherUid]) {
                            setParticipantName(participantCache[otherUid]);
                        }
                        try {
                            const response = await api.post('/api/auth/users/batch', { uids: [otherUid] });
                            const users = response.data.users || {};
                            if (users[otherUid]) {
                                const name = users[otherUid].displayName || users[otherUid].email || otherUid;
                                participantCache[otherUid] = name;
                                setParticipantName(name);

                                // Determine online status from lastSeen
                                const lastSeen = users[otherUid].lastSeen;
                                if (lastSeen) {
                                    const lastSeenDate = lastSeen._seconds
                                        ? new Date(lastSeen._seconds * 1000)
                                        : new Date(lastSeen);
                                    const diffMs = Date.now() - lastSeenDate.getTime();
                                    setOnlineStatus(diffMs < 30 * 1000 ? 'online' : 'away');
                                }
                            } else {
                                setParticipantName(otherUid);
                            }
                        } catch {
                            setParticipantName(otherUid);
                        }
                    }
                }
            } catch (err) {
                console.warn('[ChatWindow] Failed to resolve participant:', err);
            }
        };

        resolveParticipant();

        // Poll online status every 60 seconds
        const interval = setInterval(async () => {
            if (!otherUidRef) return;
            try {
                const response = await api.post('/api/auth/users/batch', { uids: [otherUidRef] });
                const users = response.data.users || {};
                const lastSeen = users[otherUidRef]?.lastSeen;
                if (lastSeen) {
                    const lastSeenDate = lastSeen._seconds
                        ? new Date(lastSeen._seconds * 1000)
                        : new Date(lastSeen);
                    const diffMs = Date.now() - lastSeenDate.getTime();
                    setOnlineStatus(diffMs < 30 * 1000 ? 'online' : 'away');
                }
            } catch { /* ignore */ }
        }, 15_000);

        return () => clearInterval(interval);
    }, [conversationId, currentUser.uid]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Mark unread messages from the other user as read
    useEffect(() => {
        if (!conversationId || !messages.length) return;

        const unreadIds = messages
            .filter((m) => m.senderId !== currentUser.uid && !(m.readBy || []).includes(currentUser.uid))
            .map((m) => m.id);

        if (unreadIds.length > 0) {
            api.put('/api/messages/read', {
                conversationId,
                messageIds: unreadIds,
            }).catch((err) => console.warn('[ChatWindow] Failed to mark messages as read:', err));
        }
    }, [messages, conversationId, currentUser.uid]);

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;

        const content = newMessage.trim();
        setNewMessage('');
        setSending(true);

        try {
            await api.post('/api/messages', {
                conversationId,
                type: 'text',
                content,
            });
        } catch (err) {
            console.error('[Chat] Failed to send message:', err);
            setNewMessage(content); // Restore on failure
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a JPEG, PNG, or WEBP image.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Image must be under 10MB.');
            return;
        }

        setSending(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('conversationId', conversationId);

            await api.post('/api/messages/image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        } catch (err) {
            console.error('[Chat] Image upload failed:', err);
        } finally {
            setSending(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="h-full flex flex-col bg-navy-900" style={keyboardOffset > 0 ? { paddingBottom: `${keyboardOffset}px` } : undefined}>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-3 md:px-5 h-12 md:h-14 border-b border-surface-border bg-navy-950/50 backdrop-blur-sm flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    {/* Mobile back button */}
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="md:hidden p-1.5 rounded-lg hover:bg-accent-teal/10 transition-all text-white/50 flex-shrink-0"
                            title="Back to conversations"
                        >
                            <ArrowLeft className="w-[18px] h-[18px]" />
                        </button>
                    )}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-teal/30 to-accent-blue/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent-teal font-display font-semibold text-sm">
                            {participantName.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-white font-display font-semibold text-sm truncate leading-tight">{participantName}</h3>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${onlineStatus === 'online' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-white/20'}`} />
                            <p className={`text-[11px] leading-tight ${onlineStatus === 'online' ? 'text-emerald-400' : 'text-white/30'}`}>
                                {onlineStatus === 'online' ? 'Online' : 'Away'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* SOS Button — always pinned to top-right */}
                <SOSButton conversationId={conversationId} />
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 touch-scroll bg-chat-pattern">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 text-accent-teal animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-accent-teal/10 flex items-center justify-center mb-4">
                            <Send className="w-6 h-6 md:w-7 md:h-7 text-accent-teal/40" />
                        </div>
                        <p className="text-white/30 text-sm">No messages yet</p>
                        <p className="text-white/20 text-xs mt-1">Send the first message to start the conversation</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) =>
                            msg.type === 'image' ? (
                                <ImageMessage
                                    key={msg.id}
                                    message={msg}
                                    isOwn={msg.senderId === currentUser.uid}
                                />
                            ) : (
                                <MessageBubble
                                    key={msg.id}
                                    message={msg}
                                    isOwn={msg.senderId === currentUser.uid}
                                    currentUserId={currentUser.uid}
                                    conversationId={conversationId}
                                />
                            )
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Message Input — compact on mobile, keyboard-aware */}
            <div
                ref={inputBarRef}
                className="px-4 md:px-5 py-2.5 md:py-3 border-t border-surface-border bg-navy-950/50 safe-bottom flex-shrink-0"
            >
                <div className="flex items-center gap-1.5 md:gap-2">
                    {/* Image Upload — compact */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 md:p-2 rounded-lg text-white/30 hover:text-accent-teal hover:bg-accent-teal/10 transition-all flex-shrink-0"
                        title="Send image"
                    >
                        <ImagePlus className="w-[18px] h-[18px] md:w-5 md:h-5" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                    />

                    {/* Text Input */}
                    <div className="flex-1 min-w-0">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="input-field py-2 md:py-2.5 text-sm"
                            disabled={sending}
                        />
                    </div>

                    {/* Send Button */}
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-gradient-to-r from-accent-teal to-accent-blue text-navy-900 hover:shadow-lg hover:shadow-accent-teal/25 transition-all active:scale-95 disabled:opacity-30 disabled:hover:shadow-none flex-shrink-0"
                    >
                        {sending ? (
                            <Loader2 className="w-[18px] h-[18px] md:w-5 md:h-5 animate-spin" />
                        ) : (
                            <Send className="w-[18px] h-[18px] md:w-5 md:h-5" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
