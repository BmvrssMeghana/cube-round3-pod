import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cb: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          card: 'var(--bg-card)',
          raised: 'var(--bg-raised)',
          border: 'var(--border)',
          active: 'var(--border-active)',
        },
        brand: {
          surface: 'var(--bg-surface)',
          card: 'var(--bg-card)',
          border: 'var(--border)',
          muted: 'var(--text-muted)',
          yellow: 'var(--accent)',
          secondary: '#22c55e',
          crimson: '#ef4444',
          orange: '#f59e0b',
          cyan: '#06b6d4',
        },
        pass: '#167347',
        fail: '#a62736',
        uncertain: '#8b5b07',
        blocked: '#6038a0',
        pending: '#63748a',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Poppins', 'system-ui', 'sans-serif'],
        poppins: ['Poppins', 'system-ui', 'sans-serif'],
        heading: ['Manrope', 'system-ui', 'sans-serif'],
        manrope: ['Manrope', 'system-ui', 'sans-serif'],
        syne: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"Courier New"', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'blue-glow': 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)',
        'card-shine': 'linear-gradient(135deg, rgba(59,130,246,0.04) 0%, transparent 50%)',
      },
      boxShadow: {
        'blue-sm': '0 0 0 1px rgba(59,130,246,0.2), 0 2px 8px rgba(59,130,246,0.06)',
        'blue-md': '0 0 0 1px rgba(59,130,246,0.28), 0 4px 20px rgba(59,130,246,0.1)',
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-lg': '0 4px 24px rgba(15,23,42,0.1)',
      },
      keyframes: {
        shimmer: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
        'slide-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        ping2: { '0%,100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.5)', opacity: '0.4' } },
      },
      animation: {
        shimmer: 'shimmer 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.25s ease-out',
        ping2: 'ping2 2s ease-in-out infinite',
      },
    },
  },
  plugins: [forms, containerQueries],
};
