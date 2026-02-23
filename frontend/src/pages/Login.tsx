// ── SafeSpeak — Login Page ──────────────────────────────────────────
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

export function LoginPage() {
    const { user, loading } = useAuth();
    const [isRegister, setIsRegister] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-navy-900">
                <div className="w-8 h-8 border-2 border-accent-teal/30 border-t-accent-teal rounded-full animate-spin" />
            </div>
        );
    }

    if (user) {
        return <Navigate to="/chat" replace />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4 grain-overlay">
            {/* Background gradient mesh */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-teal/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 w-full">
                {isRegister ? (
                    <RegisterForm onSwitchToLogin={() => setIsRegister(false)} />
                ) : (
                    <LoginForm onSwitchToRegister={() => setIsRegister(true)} />
                )}
            </div>
        </div>
    );
}
