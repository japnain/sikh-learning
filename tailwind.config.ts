const percentOpacity = Object.fromEntries(
  Array.from({ length: 101 }, (_, value) => [String(value), String(value / 100)])
)

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        parchment: '#f8efe1',
        'parchment-low': '#f0e5d4',
        'parchment-deep': '#e0c59d',
        'parchment-card': '#fffcf5',
        ink: '#2b1f17',
        saffron: '#8e4c20',
        'saffron-light': '#d39842',
        sand: '#bea07b',
        mist: '#ede1cf',
        gold: '#9b6328',
        'gold-light': '#f2c777',
        'gold-dark': '#5f3712',
        'dark-bg': '#15101d',
        'dark-panel': '#1e1826',
        'dark-card': '#271f30',
        'dark-surface': '#1b1623',
        'dark-text': '#f8f0e2',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
      },
      fontFamily: {
        gurmukhi: ['Noto Serif Gurmukhi', 'serif'],
        devanagari: ['Noto Serif Devanagari', 'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mangal', 'serif'],
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
      opacity: percentOpacity,
    },
  },
  plugins: [],
}
