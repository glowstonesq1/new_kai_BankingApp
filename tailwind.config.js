/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kidbank: {
          purple: '#7C3AED',
          pink: '#EC4899',
          yellow: '#F59E0B',
          green: '#10B981',
          blue: '#3B82F6',
          orange: '#F97316',
          red: '#EF4444',
        },
      },
      fontFamily: {
        display: ['Nunito', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-fast': 'pulse 1s infinite',
        'spin-slow': 'spin 3s linear infinite',
        rocket: 'rocketUp 0.6s ease-out forwards',
        fall: 'fallDown 0.6s ease-out forwards',
      },
      keyframes: {
        rocketUp: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: 1 },
          '100%': { transform: 'translateY(-24px) scale(1.3)', opacity: 0 },
        },
        fallDown: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: 1 },
          '100%': { transform: 'translateY(24px) scale(1.3)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
}
