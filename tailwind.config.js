/** Identidad POWER FITNESS: azul eléctrico + morado sobre azul noche */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#05050F', 900: '#07071A', 850: '#0A0A18', 800: '#0D0D1A', 700: '#12122A', 600: '#1A1A38', 500: '#24244A' },
        brand: { 50: '#EAF2FF', 100: '#D3E4FF', 200: '#A9CAFF', 300: '#7EB8FF', 400: '#3D8EFF', 500: '#1E6FE3', 600: '#1550B0', 700: '#0F3C85' },
        violet: { 300: '#A78BFA', 400: '#8B5CF6', 500: '#6B3FA0', 600: '#4A2878' },
        gold: { 400: '#F5C842', 500: '#D4A017' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Bebas Neue"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(61,142,255,.25), 0 8px 30px -8px rgba(30,111,227,.45)',
        card: '0 1px 0 0 rgba(255,255,255,.04) inset, 0 10px 30px -12px rgba(0,0,0,.6)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1E6FE3 0%, #6B3FA0 100%)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        pop: { '0%': { transform: 'scale(.92)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
      animation: { 'fade-up': 'fade-up .35s ease-out both', pop: 'pop .25s ease-out both' },
    },
  },
  plugins: [],
};
