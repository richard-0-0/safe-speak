// ── SafeSpeak — Message Bubble Component ────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Check, CheckCheck, Pencil, Trash2, X } from 'lucide-react';
import type { Message } from '@/types';
import { api } from '@/services/api';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    currentUserId?: string;
    conversationId?: string;
}

export function MessageBubble({ message, isOwn, currentUserId, conversationId }: MessageBubbleProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [menuBelow, setMenuBelow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [editLoading, setEditLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const flagLabel = message.flagDetails?.label;
    const flagConfidence = message.flagDetails?.confidence ?? 0;
    const isFlagged = message.flagged && flagLabel !== 'clean';

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const getBadgeStyle = () => {
        if (flagLabel === 'hate_speech' || flagLabel === 'threat') return 'badge-rose';
        if (flagLabel === 'offensive') return 'badge-amber';
        if (flagLabel === 'flagged') return 'badge-amber';
        return '';
    };

    const getFlagText = () => {
        if (flagLabel === 'hate_speech') return 'Hate Speech';
        if (flagLabel === 'threat') return 'Threat';
        if (flagLabel === 'offensive') return 'Offensive';
        if (flagLabel === 'flagged') return 'Flagged';
        return '';
    };

    const timestamp = message.timestamp?.toDate
        ? format(message.timestamp.toDate(), 'h:mm a')
        : '';

    // Read receipt
    const isRead = isOwn && message.readBy && currentUserId
        ? message.readBy.some((uid) => uid !== currentUserId)
        : false;

    // ── Edit handler ──
    const handleEdit = async () => {
        if (!editContent.trim() || !conversationId) return;
        setEditLoading(true);
        try {
            await api.put(`/api/messages/${conversationId}/${message.id}`, {
                content: editContent.trim(),
            });
            setIsEditing(false);
        } catch (err) {
            console.error('[MessageBubble] Edit failed:', err);
        } finally {
            setEditLoading(false);
        }
    };

    // ── Delete handler ──
    const handleDelete = async () => {
        if (!conversationId) return;
        setDeleteLoading(true);
        try {
            await api.delete(`/api/messages/${conversationId}/${message.id}`);
            setShowMenu(false);
        } catch (err) {
            console.error('[MessageBubble] Delete failed:', err);
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── Open menu with smart positioning (below if near top) ──
    const openMenu = () => {
        if (!isOwn) return;
        if (bubbleRef.current) {
            const rect = bubbleRef.current.getBoundingClientRect();
            // If the bubble is within 80px of the top of the viewport, show menu below instead
            setMenuBelow(rect.top < 80);
        }
        setShowMenu(true);
    };

    // ── Long press for mobile ──
    const handleTouchStart = () => {
        if (!isOwn) return;
        longPressTimer.current = setTimeout(openMenu, 500);
    };
    const handleTouchEnd = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    // ── Right-click menu for desktop ──
    const handleContextMenu = (e: React.MouseEvent) => {
        if (!isOwn) return;
        e.preventDefault();
        openMenu();
    };

    // ── Deleted message display ──
    if (message.deleted) {
        return (
            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
                <div className="px-3.5 py-2.5 rounded-2xl bg-surface/30 border border-surface-border/30">
                    <p className="text-white/30 text-sm italic">🚫 This message was deleted</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 group animate-fade-in-up`}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <div className="relative max-w-[85%] md:max-w-[75%]" ref={bubbleRef}>
                {/* Context Menu (Edit / Delete) */}
                {showMenu && isOwn && !isEditing && (
                    <div
                        ref={menuRef}
                        className={`absolute z-50 ${isOwn ? 'right-0' : 'left-0'} ${menuBelow ? 'top-full mt-1' : 'bottom-full mb-1'
                            } bg-navy-800 border border-surface-border rounded-lg shadow-xl overflow-hidden`}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditContent(message.content); setShowMenu(false); }}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-accent-teal/10 hover:text-accent-teal w-full transition-colors"
                            disabled={message.type !== 'text'}
                        >
                            <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 w-full transition-colors"
                            disabled={deleteLoading}
                        >
                            <Trash2 className="w-3 h-3" /> {deleteLoading ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                )}

                {/* Inline Edit Mode */}
                {isEditing ? (
                    <div className="flex items-center gap-1.5">
                        <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setIsEditing(false); }}
                            className="input-field py-1.5 text-sm flex-1 min-w-[150px]"
                            autoFocus
                            disabled={editLoading}
                        />
                        <button onClick={handleEdit} disabled={editLoading || !editContent.trim()} className="p-1.5 rounded-lg bg-accent-teal/20 text-accent-teal hover:bg-accent-teal/30 transition-colors">
                            <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Message Content with timestamp INSIDE the bubble */}
                        <div
                            className={`
                    px-3.5 pt-2.5 pb-1.5 rounded-2xl font-body text-sm leading-relaxed
                    ${isOwn
                                    ? 'bg-gradient-to-r from-accent-teal/20 to-accent-blue/20 border border-accent-teal/20 text-white rounded-br-md'
                                    : isFlagged
                                        ? 'bg-surface border border-flag-amber/30 text-white/90 rounded-bl-md'
                                        : 'bg-surface border border-surface-border text-white/90 rounded-bl-md'
                                }
                  `}
                        >
                            {/* Flag Badge — inline at top of bubble */}
                            {isFlagged && !isOwn && (
                                <div className={`${getBadgeStyle()} mb-1.5`}>
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>{getFlagText()} {Math.round(flagConfidence * 100)}%</span>
                                </div>
                            )}
                            <p>{message.content}
                                {message.edited && (
                                    <span className="text-[10px] text-white/30 ml-1.5 italic">(edited)</span>
                                )}
                            </p>
                            {/* Timestamp + read receipt — always visible inside bubble */}
                            <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                <span className="text-[10px] text-white/30">{timestamp}</span>
                                {isOwn && (
                                    isRead
                                        ? <CheckCheck className="w-3 h-3 text-accent-teal" />
                                        : <Check className="w-3 h-3 text-white/30" />
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
