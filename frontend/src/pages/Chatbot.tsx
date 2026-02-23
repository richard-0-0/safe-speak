// ── SafeSpeak — Chatbot Page ────────────────────────────────────────
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChatbotPanel } from '@/components/chatbot/ChatbotPanel';
import { Shield, MessageSquare, LogOut } from 'lucide-react';

export function ChatbotPage() {
    const { user, loading, logout } = useAuth();

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

    return (
        <div className="h-screen flex flex-col bg-navy-900">
            {/* Navigation */}
            <nav className="flex items-center justify-between px-6 py-3 border-b border-surface-border bg-navy-950/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-teal to-accent-blue flex items-center justify-center">
                        <Shield className="w-4 h-4 text-navy-900" />
                    </div>
                    <span className="font-display font-bold text-white text-lg">SafeSpeak</span>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/chat"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-accent-teal hover:bg-accent-teal/5 transition-all text-sm"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Chat
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

            {/* Chatbot Panel */}
            <div className="flex-1 overflow-hidden">
                <ChatbotPanel />
            </div>
        </div>
    );
}
