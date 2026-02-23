/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // ── Ocean Depths Theme — SafeSpeak ──────────────
                navy: {
                    50: '#E8EFF8',
                    100: '#C5D5EC',
                    200: '#9EB8DE',
                    300: '#7699CF',
                    400: '#5882C4',
                    500: '#3A6BB9',
                    600: '#2D5A9E',
                    700: '#1E4579',
                    800: '#111827',
                    900: '#0A0F1E',
                    950: '#060A14',
                },
                accent: {
                    teal: '#00D4FF',
                    blue: '#38BDF8',
                    glow: '#00D4FF33',
                },
                flag: {
                    amber: '#F59E0B',
                    rose: '#F43F5E',
                    red: '#EF4444',
                },
                success: '#10B981',
                surface: '#111827',
                'surface-border': 'rgba(255, 255, 255, 0.07)',
            },
            fontFamily: {
                display: ['"Clash Display"', '"Cabinet Grotesk"', 'system-ui', 'sans-serif'],
                body: ['"DM Sans"', '"Instrument Sans"', 'system-ui', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                'slide-in-right': 'slideInRight 0.3s ease-out forwards',
                'slide-in-left': 'slideInLeft 0.3s ease-out forwards',
                'pulse-flag': 'pulseFlag 2s ease-in-out infinite',
                'scale-in': 'scaleIn 0.2s ease-out forwards',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                pulseFlag: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            backgroundImage: {
                'gradient-mesh': 'linear-gradient(135deg, #0A0F1E 0%, #111827 50%, #0A0F1E 100%)',
                'gradient-accent': 'linear-gradient(135deg, #00D4FF 0%, #38BDF8 100%)',
                'gradient-danger': 'linear-gradient(135deg, #F43F5E 0%, #EF4444 100%)',
            },
        },
    },
    plugins: [],
}
