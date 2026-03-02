/** @type {import('tailwindcss').Config} */

function withOpacity(variableName: string) {
    return ({ opacityValue }: { opacityValue?: number }) => {
        if (opacityValue !== undefined) {
            return `rgb(var(${variableName}) / ${opacityValue})`;
        }
        return `rgb(var(${variableName}))`;
    };
}

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // ── Theme-aware colors via CSS variable channels ──
                navy: {
                    50: withOpacity('--color-navy-50'),
                    100: withOpacity('--color-navy-100'),
                    200: withOpacity('--color-navy-200'),
                    800: withOpacity('--color-navy-800'),
                    900: withOpacity('--color-navy-900'),
                    950: withOpacity('--color-navy-950'),
                },
                accent: {
                    teal: withOpacity('--color-accent-teal'),
                    blue: withOpacity('--color-accent-blue'),
                },
                flag: {
                    amber: withOpacity('--color-flag-amber'),
                    rose: withOpacity('--color-flag-rose'),
                    red: withOpacity('--color-flag-red'),
                },
                success: withOpacity('--color-success'),
                surface: withOpacity('--color-surface'),
                'surface-border': `rgb(var(--color-surface-border) / var(--color-surface-border-opacity))`,
                white: withOpacity('--color-white-val'),
                'theme-text': withOpacity('--color-text'),
            },
            textColor: {
                white: withOpacity('--color-white-val'),
            },
            fontFamily: {
                display: ['var(--font-display)'],
                body: ['var(--font-body)'],
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
                'gradient-mesh': `linear-gradient(135deg, rgb(var(--color-navy-900)) 0%, rgb(var(--color-surface)) 50%, rgb(var(--color-navy-900)) 100%)`,
                'gradient-accent': `linear-gradient(135deg, rgb(var(--color-accent-teal)) 0%, rgb(var(--color-accent-blue)) 100%)`,
                'gradient-danger': `linear-gradient(135deg, rgb(var(--color-flag-rose)) 0%, rgb(var(--color-flag-red)) 100%)`,
            },
        },
    },
    plugins: [],
}
