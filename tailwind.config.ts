export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        parchment: '#fdf5e8',
        'parchment-low': '#f4e8d4',
        'parchment-deep': '#ead4ae',
        'parchment-card': '#fff9ef',
        ink: '#2a1b10',
        saffron: '#9b4f1f',
        'saffron-light': '#d8a25a',
        sand: '#cfa97d',
        mist: '#f0e3d0',
        gold: '#b87b2f',
        'gold-light': '#e3b566',
        'gold-dark': '#744818',
        'dark-bg': '#0f0a1e',
        'dark-panel': '#120d27',
        'dark-card': '#1d1535',
        'dark-surface': '#161230',
        'dark-text': '#e8e0d4',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
      },
      fontFamily: {
        gurmukhi: ['Noto Serif Gurmukhi', 'serif'],
        display: ['Cormorant Garamond', 'serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(197,150,58,0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(197,150,58,0.6)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        'slide-up': 'slide-up 0.4s ease-out both',
        'scale-in': 'scale-in 0.3s ease-out both',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.1)',
        soft: '0 18px 45px rgba(30, 27, 19, 0.08)',
        gold: '0 2px 16px rgba(197,150,58,0.2)',
        'gold-strong': '0 4px 24px rgba(197,150,58,0.35)',
      },
    },
  },
  plugins: [],
}
