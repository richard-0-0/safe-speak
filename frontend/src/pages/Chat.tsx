// ── SafeSpeak — Chat Page ───────────────────────────────────────────
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Shield, LogOut, Bot, MessageSquare, UserPlus, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { Link } from 'react-router-dom';

export function ChatPage() {
    const { user, loading, logout } = useAuth();
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [showNewChat, setShowNewChat] = useState(false);
    const [newChatEmail, setNewChatEmail] = useState('');
    const [creating, setCreating] = useState(false);

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
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Could not start conversation';
            alert(message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-navy-900">
            {/* Top Navigation Bar */}
            <nav className="flex items-center justify-between px-6 py-3 border-b border-surface-border bg-navy-950/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-teal to-accent-blue flex items-center justify-center">
                        <Shield className="w-4 h-4 text-navy-900" />
                    </div>
                    <span className="font-display font-bold text-white text-lg">SafeSpeak</span>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/chatbot"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-accent-teal hover:bg-accent-teal/5 transition-all text-sm"
                    >
                        <Bot className="w-4 h-4" />
                        AI Assistant
                    </Link>

                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-surface-border">
                        <span className="text-white/40 text-sm">{user.displayName}</span>
                        <button
                            onClick={logout}
                            className="p-2 rounded-lg text-white/30 hover:text-flag-rose hover:bg-flag-rose/5 transition-all"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar — Conversation List */}
                <div className="w-80 flex-shrink-0">
                    <ConversationList
                        userId={user.uid}
                        activeConversationId={activeConversationId}
                        onSelectConversation={setActiveConversationId}
                        onNewConversation={() => setShowNewChat(true)}
                    />
                </div>

                {/* Chat Area */}
                <div className="flex-1">
                    {activeConversationId ? (
                        <ChatWindow
                            conversationId={activeConversationId}
                            currentUser={user}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center px-8">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-teal/10 to-accent-blue/10 flex items-center justify-center mb-5 animate-fade-in">
                                <MessageSquare className="w-10 h-10 text-accent-teal/30" />
                            </div>
                            <h2 className="text-xl font-display font-semibold text-white/60 mb-2 animate-fade-in-up stagger-1">
                                Select a conversation
                            </h2>
                            <p className="text-white/30 text-sm max-w-sm animate-fade-in-up stagger-2">
                                Choose a conversation from the sidebar or start a new one to begin messaging securely.
                            </p>
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
                                <h3 className="text-lg font-display font-semibold text-white">New Conversation</h3>
                                <p className="text-white/40 text-xs">Enter the email of the user you want to chat with</p>
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
