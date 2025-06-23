/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
      colors: {
        copper: '#B87333',
        gold: '#FFD700',
        neonGreen: '#00FF99',
      },
    },
  },
  plugins: [],
};