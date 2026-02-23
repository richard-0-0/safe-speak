// ── SafeSpeak — Message Bubble Component ────────────────────────────
import { useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import type { Message } from '@/types';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
    const [showTimestamp, setShowTimestamp] = useState(false);

    const flagLabel = message.flagDetails?.label;
    const flagConfidence = message.flagDetails?.confidence ?? 0;
    const isFlagged = message.flagged && flagLabel !== 'clean' && flagConfidence >= 0.85;

    const getBadgeStyle = () => {
        if (flagLabel === 'hate_speech' || flagLabel === 'threat') return 'badge-rose';
        if (flagLabel === 'offensive') return 'badge-amber';
        return '';
    };

    const getFlagText = () => {
        if (flagLabel === 'hate_speech') return 'Hate Speech';
        if (flagLabel === 'threat') return 'Threat';
        if (flagLabel === 'offensive') return 'Offensive';
        return '';
    };

    const timestamp = message.timestamp?.toDate
        ? format(message.timestamp.toDate(), 'h:mm a')
        : '';

    return (
        <div
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 group animate-fade-in-up`}
            onMouseEnter={() => setShowTimestamp(true)}
            onMouseLeave={() => setShowTimestamp(false)}
        >
            <div className="relative max-w-[75%]">
                {/* Message Content */}
                <div
                    className={`
            px-4 py-2.5 rounded-2xl font-body text-sm leading-relaxed
            ${isOwn
                            ? 'bg-gradient-to-r from-accent-teal/20 to-accent-blue/20 border border-accent-teal/20 text-white rounded-br-md'
                            : 'bg-surface border border-surface-border text-white/90 rounded-bl-md'
                        }
          `}
                >
                    {message.content}
                </div>

                {/* Flag Badge — only shown to recipient, never to sender */}
                {isFlagged && !isOwn && (
                    <div className={`absolute -top-2 -right-2 ${getBadgeStyle()}`}>
                        <AlertTriangle className="w-3 h-3" />
                        <span>{getFlagText()}</span>
                    </div>
                )}

                {/* Timestamp on hover */}
                <div
                    className={`
            absolute -bottom-5 text-[10px] text-white/30 font-body
            transition-opacity duration-200
            ${showTimestamp ? 'opacity-100' : 'opacity-0'}
            ${isOwn ? 'right-1' : 'left-1'}
          `}
                >
                    {timestamp}
                    {isFlagged && !isOwn && (
                        <span className="ml-2 text-flag-amber">
                            {Math.round(flagConfidence * 100)}% confidence
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
