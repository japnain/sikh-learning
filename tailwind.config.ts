export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#C9A84C',
        surface: '#1A1A1A',
      },
      fontFamily: {
        gurmukhi: ['"Noto Sans Gurmukhi"', 'sans-serif'],
        ui: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
