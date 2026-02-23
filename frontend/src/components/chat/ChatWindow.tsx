// ── SafeSpeak — Chat Window Component ───────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, Loader2 } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { api } from '@/services/api';
import { MessageBubble } from './MessageBubble';
import { ImageMessage } from './ImageMessage';
import { SOSButton } from '@/components/sos/SOSButton';
import type { User } from '@/types';

interface ChatWindowProps {
    conversationId: string;
    currentUser: User;
}

export function ChatWindow({ conversationId, currentUser }: ChatWindowProps) {
    const { messages, loading } = useMessages(conversationId);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
        <div className="h-full flex flex-col bg-navy-900">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-navy-950/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-teal/30 to-accent-blue/30 flex items-center justify-center">
                        <span className="text-accent-teal font-display font-semibold text-sm">C</span>
                    </div>
                    <div>
                        <h3 className="text-white font-display font-semibold text-sm">Conversation</h3>
                        <p className="text-white/30 text-xs">{messages.length} messages</p>
                    </div>
                </div>

                {/* SOS Button — always pinned to top-right */}
                <SOSButton conversationId={conversationId} />
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 text-accent-teal animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-2xl bg-accent-teal/10 flex items-center justify-center mb-4">
                            <Send className="w-7 h-7 text-accent-teal/40" />
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
                                />
                            )
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Message Input */}
            <div className="px-6 py-4 border-t border-surface-border bg-navy-950/30">
                <div className="flex items-center gap-3">
                    {/* Image Upload */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 rounded-xl text-white/30 hover:text-accent-teal hover:bg-accent-teal/10 transition-all"
                        title="Send image"
                    >
                        <ImagePlus className="w-5 h-5" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                    />

                    {/* Text Input */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="input-field py-2.5 pr-12"
                            disabled={sending}
                        />
                    </div>

                    {/* Send Button */}
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="p-2.5 rounded-xl bg-gradient-to-r from-accent-teal to-accent-blue text-navy-900 hover:shadow-lg hover:shadow-accent-teal/25 transition-all active:scale-95 disabled:opacity-30 disabled:hover:shadow-none"
                    >
                        {sending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
