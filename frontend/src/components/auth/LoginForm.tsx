// ── SafeSpeak — Login Form Component ────────────────────────────────
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginFormData {
    email: string;
    password: string;
}

interface LoginFormProps {
    onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
    const { loginWithEmail, loginWithGoogle, error } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        try {
            await loginWithEmail(data.email, data.password);
        } catch {
            // Error is handled by useAuth hook
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto animate-fade-in-up">
            {/* Logo & Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-teal to-accent-blue mb-4 glow-teal">
                    <Shield className="w-8 h-8 text-navy-900" />
                </div>
                <h1 className="text-3xl font-display font-bold gradient-text mb-2">
                    SafeSpeak
                </h1>
                <p className="text-white/50 font-body text-sm">
                    Secure messaging with AI protection
                </p>
            </div>

            {/* Login Form */}
            <div className="glass-card p-8">
                <h2 className="text-xl font-display font-semibold text-theme-text mb-6">
                    Welcome back
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Email */}
                    <div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type="email"
                                placeholder="Email address"
                                className="input-field pl-11"
                                {...register('email', {
                                    required: 'Email is required',
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: 'Enter a valid email address',
                                    },
                                })}
                            />
                        </div>
                        {errors.email && (
                            <p className="text-flag-rose text-xs mt-1">{errors.email.message}</p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                className="input-field pl-11 pr-11"
                                {...register('password', {
                                    required: 'Password is required',
                                    minLength: { value: 8, message: 'Minimum 8 characters' },
                                })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-flag-rose text-xs mt-1">{errors.password.message}</p>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-flag-rose/10 border border-flag-rose/20">
                            <p className="text-flag-rose text-sm">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-surface-border" />
                    <span className="text-white/30 text-xs uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-surface-border" />
                </div>

                {/* Google OAuth */}
                <button
                    onClick={loginWithGoogle}
                    className="btn-secondary w-full flex items-center justify-center gap-3"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                {/* Switch to Register */}
                <p className="text-center text-white/40 text-sm mt-6">
                    Don't have an account?{' '}
                    <button
                        onClick={onSwitchToRegister}
                        className="text-accent-teal hover:underline font-medium"
                    >
                        Create one
                    </button>
                </p>
            </div>
        </div>
    );
}
