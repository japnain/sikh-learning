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
        'dark-bg': '#1a1a2e',
        'dark-card': '#2d2d4a',
        'dark-surface': '#252540',
        'dark-text': '#e8e0d4',
      },
      fontFamily: {
        gurmukhi: ['Noto Serif Gurmukhi', 'serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
