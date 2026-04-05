export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#fff8ef',
        'parchment-low': '#fbf3e4',
        'parchment-card': '#ffffff',
        ink: '#1e1b13',
        saffron: '#904d00',
        'saffron-light': '#f99c45',
        sand: '#dbc2b0',
        gold: '#c5963a',
        'gold-light': '#e8c468',
        'gold-dark': '#8b6914',
        'dark-bg': '#0f0a1e',
        'dark-card': '#1d1535',
        'dark-surface': '#161230',
        'dark-text': '#e8e0d4',
      },
      fontFamily: {
        gurmukhi: ['Noto Serif Gurmukhi', 'serif'],
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
        gold: '0 2px 16px rgba(197,150,58,0.2)',
        'gold-strong': '0 4px 24px rgba(197,150,58,0.35)',
      },
    },
  },
  plugins: [],
}
