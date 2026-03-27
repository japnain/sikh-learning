export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#C9A84C',
        surface: '#1A1A1A',
        ember: '#7B2D00',
        coal: '#1A0800',
      },
      fontFamily: {
        gurmukhi: ['"Noto Sans Gurmukhi"', 'sans-serif'],
        ui: ['Inter', 'sans-serif'],
        pixel: ['Silkscreen', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
