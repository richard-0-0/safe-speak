// ── SafeSpeak — Image Message Component ─────────────────────────────
import { useState } from 'react';
import { Lock, AlertTriangle, Eye } from 'lucide-react';
import type { Message } from '@/types';

interface ImageMessageProps {
    message: Message;
    isOwn: boolean;
}

export function ImageMessage({ message, isOwn }: ImageMessageProps) {
    const [revealed, setRevealed] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const isBlurred = message.imageBlurred && !revealed;

    const handleRevealClick = () => {
        setShowConfirmDialog(true);
    };

    const confirmReveal = () => {
        setRevealed(true);
        setShowConfirmDialog(false);
    };

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in-up`}>
            <div className="relative max-w-[75vw] md:max-w-[300px] rounded-2xl overflow-hidden border border-surface-border">
                {/* Image */}
                <div className="relative">
                    <img
                        src={message.content}
                        alt="Shared image"
                        className={`w-full h-auto max-h-[300px] object-cover transition-all duration-500 ${isBlurred ? 'blur-[20px] scale-110' : ''
                            }`}
                    />

                    {/* Blur overlay with lock icon */}
                    {isBlurred && (
                        <div
                            className="absolute inset-0 flex flex-col items-center justify-center bg-navy-900/60 cursor-pointer"
                            onClick={handleRevealClick}
                        >
                            <Lock className="w-8 h-8 text-flag-amber mb-2" />
                            <div className="flex items-center gap-1 text-flag-amber text-sm font-semibold">
                                <AlertTriangle className="w-4 h-4" />
                                Flagged content
                            </div>
                            <p className="text-white/50 text-xs mt-1">Tap to reveal</p>
                        </div>
                    )}
                </div>

                {/* Confirmation Dialog */}
                {showConfirmDialog && (
                    <div className="absolute inset-0 flex items-center justify-center bg-navy-900/90 z-10">
                        <div className="p-4 text-center">
                            <AlertTriangle className="w-8 h-8 text-flag-amber mx-auto mb-2" />
                            <p className="text-white text-sm font-semibold mb-1">
                                Reveal flagged content?
                            </p>
                            <p className="text-white/50 text-xs mb-4">
                                This image may contain harmful or offensive content.
                            </p>
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => setShowConfirmDialog(false)}
                                    className="px-4 py-2 text-xs rounded-lg border border-surface-border text-white/60 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmReveal}
                                    className="px-4 py-2 text-xs rounded-lg bg-flag-amber/20 text-flag-amber border border-flag-amber/30 hover:bg-flag-amber/30 transition-colors flex items-center gap-1"
                                >
                                    <Eye className="w-3 h-3" />
                                    Reveal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
