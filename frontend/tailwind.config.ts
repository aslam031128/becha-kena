import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        brand: {
          green: '#22C55E',
          'green-dark': '#16A34A',
          'green-light': '#DCFCE7',
        },
        accent: {
          purple: '#7C3AED',
          'purple-dark': '#6D28D9',
          yellow: '#FACC15',
        },
        surface: {
          primary: '#FFFFFF',
          secondary: '#F8FAFC',
          dark: '#0F172A',
        },
        content: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        },
        line: {
          border: '#E2E8F0',
        },
        status: {
          danger: '#EF4444',
          'danger-bg': '#FEF2F2',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
      },
      fontFamily: {
        primary: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        bengali: ['var(--font-noto-bengali)', "'Hind Siliguri'", 'sans-serif'],
      },
      keyframes: {
        pulseFast: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'pulse-fast': 'pulseFast 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
