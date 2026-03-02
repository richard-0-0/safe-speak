// ── SafeSpeak — Chat Page ───────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Shield, LogOut, Bot, MessageSquare, UserPlus, Loader2, Sun, Moon, X, MessagesSquare } from 'lucide-react';
import { api } from '@/services/api';
import { Link } from 'react-router-dom';

import { requestNotificationPermission } from '@/services/firebase';

export function ChatPage() {
    const { user, loading, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [showNewChat, setShowNewChat] = useState(false);
    const [newChatEmail, setNewChatEmail] = useState('');
    const [creating, setCreating] = useState(false);
    // Mobile: controls whether the sidebar drawer is visible
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Notification permission state
    const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationStatus(Notification.permission);
        }
    }, []);

    const enableNotifications = async () => {
        const token = await requestNotificationPermission();
        if (token) {
            try {
                await api.post('/api/auth/fcm-token', { token });
                setNotificationStatus('granted');
            } catch (err) {
                console.error("Failed to register token", err);
            }
        } else {
            setNotificationStatus(Notification.permission);
        }
    };

    // ── Heartbeat: keep lastSeen fresh so others see us as "Online" ──
    useEffect(() => {
        if (!user) return;
        // Send heartbeat immediately on mount, then every 20s
        const ping = () => api.post('/api/auth/heartbeat').catch(() => { });
        ping();
        const interval = setInterval(ping, 20_000);
        return () => clearInterval(interval);
    }, [user]);

    // On desktop (≥768px) the sidebar is always visible; on mobile it's a drawer.
    // When a conversation is selected on mobile, close the drawer.
    const handleSelectConversation = (id: string) => {
        setActiveConversationId(id);
        setSidebarOpen(false); // close drawer on mobile
    };

    // Listen for resize — if user resizes above md breakpoint, close the drawer overlay
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 768) setSidebarOpen(false);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-navy-900">
                <div className="w-8 h-8 border-2 border-accent-teal/30 border-t-accent-teal rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const handleCreateConversation = async () => {
        if (!newChatEmail.trim()) return;
        setCreating(true);
        try {
            const response = await api.post('/api/auth/conversations', {
                participantEmail: newChatEmail.trim(),
            });
            setActiveConversationId(response.data.conversationId);
            setShowNewChat(false);
            setNewChatEmail('');
            setSidebarOpen(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Could not start conversation';
            alert(message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-navy-900">
            {/* Top Navigation Bar — hide on mobile when chat is active */}
            <nav className={`items-center justify-between px-4 md:px-6 h-14 border-b border-surface-border bg-navy-950/80 backdrop-blur-sm safe-top flex-shrink-0 ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
                {/* Left: Logo + Brand */}
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-teal to-accent-blue flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4 text-navy-900" />
                    </div>
                    <span className="font-display font-bold text-lg text-theme-text">SafeSpeak</span>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1">
                    {/* Mobile: Chats toggle */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="md:hidden p-2 rounded-lg hover:bg-accent-teal/10 transition-all text-white/50"
                        title="Conversations"
                    >
                        <MessagesSquare className="w-[18px] h-[18px]" />
                    </button>

                    <Link
                        to="/chatbot"
                        className="p-2 rounded-lg hover:bg-accent-teal/5 transition-all text-white/50"
                    >
                        <Bot className="w-[18px] h-[18px]" />
                    </Link>

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-accent-teal/10 transition-all text-white/50"
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                    </button>

                    <div className="w-px h-5 bg-surface-border mx-1" />

                    <span className="text-xs text-white/40 hidden sm:inline max-w-[80px] truncate">{user.displayName}</span>
                    <button
                        onClick={logout}
                        className="p-2 rounded-lg text-white/40 hover:text-flag-rose hover:bg-flag-rose/5 transition-all"
                        title="Sign out"
                    >
                        <LogOut className="w-[18px] h-[18px]" />
                    </button>
                </div>
            </nav>

            {/* Notification Prompt Banner */}
            {notificationStatus === 'default' && (
                <div className="bg-accent-teal/10 border-b border-accent-teal/20 px-4 py-2.5 flex items-center justify-between">
                    <p className="text-sm text-theme-text font-medium">Enable notifications to never miss a message.</p>
                    <button
                        onClick={enableNotifications}
                        className="text-xs font-semibold px-3 py-1.5 bg-accent-teal text-navy-900 rounded-lg hover:opacity-90"
                    >
                        Enable
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Mobile Sidebar Backdrop */}
                {sidebarOpen && (
                    <div
                        className="md:hidden fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar — Conversation List */}
                <div
                    className={`
                        fixed md:relative z-40 md:z-auto
                        inset-y-0 left-0 w-[85vw] max-w-[320px] md:w-80
                        transform transition-transform duration-300 ease-out
                        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                        md:translate-x-0 md:flex-shrink-0
                    `}
                >
                    {/* Mobile drawer close button */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden absolute top-3 right-3 z-50 p-1.5 rounded-lg bg-navy-900/80 text-white/50 hover:text-white/80 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <ConversationList
                        userId={user.uid}
                        activeConversationId={activeConversationId}
                        onSelectConversation={handleSelectConversation}
                        onNewConversation={() => setShowNewChat(true)}
                    />
                </div>

                {/* Chat Area */}
                <div className="flex-1 min-w-0">
                    {activeConversationId ? (
                        <ChatWindow
                            conversationId={activeConversationId}
                            currentUser={user}
                            onBack={() => {
                                setActiveConversationId(null);
                                setSidebarOpen(true);
                            }}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center px-6 md:px-8">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-accent-teal/10 to-accent-blue/10 flex items-center justify-center mb-5 animate-fade-in">
                                <MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-accent-teal/30" />
                            </div>
                            <h2 className="text-lg md:text-xl font-display font-semibold mb-2 animate-fade-in-up stagger-1 text-white/60">
                                Select a conversation
                            </h2>
                            <p className="text-sm max-w-sm animate-fade-in-up stagger-2 text-white/30">
                                Choose a conversation from the sidebar or start a new one to begin messaging securely.
                            </p>

                            {/* Mobile: button to open sidebar */}
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="md:hidden mt-4 btn-primary text-sm flex items-center gap-2"
                            >
                                <MessagesSquare className="w-4 h-4" />
                                View Conversations
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* New Chat Modal */}
            {showNewChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={() => setShowNewChat(false)} />
                    <div className="relative glass-card p-6 w-full max-w-md animate-scale-in">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-accent-teal" />
                            </div>
                            <div>
                                <h3 className="text-lg font-display font-semibold text-theme-text">New Conversation</h3>
                                <p className="text-xs text-white/40">Enter the email of the user you want to chat with</p>
                            </div>
                        </div>

                        <input
                            type="email"
                            value={newChatEmail}
                            onChange={(e) => setNewChatEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="input-field mb-4"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateConversation()}
                        />

                        <div className="flex gap-3">
                            <button onClick={() => setShowNewChat(false)} className="btn-secondary flex-1">Cancel</button>
                            <button
                                onClick={handleCreateConversation}
                                disabled={!newChatEmail.trim() || creating}
                                className="btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Chat'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
