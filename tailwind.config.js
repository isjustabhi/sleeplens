/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        night: {
          950: '#06070C',
          900: '#0A1224',
          800: '#12203E',
          700: '#16345D',
        },
        cyan: {
          450: '#44D4F5',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(112, 192, 255, 0.16), 0 24px 60px rgba(4, 18, 48, 0.55)',
        teal: '0 0 50px rgba(69, 211, 245, 0.16)',
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(circle at top, rgba(58, 123, 213, 0.22), transparent 36%), radial-gradient(circle at 80% 20%, rgba(68, 212, 245, 0.12), transparent 25%), linear-gradient(180deg, #06070C 0%, #08101D 100%)',
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        pulseSlow: 'pulseSlow 2.4s ease-in-out infinite',
        shimmer: 'shimmer 2.6s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.75', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.04)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' },
        },
      },
    },
  },
  plugins: [],
};
