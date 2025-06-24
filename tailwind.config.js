/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'crimson': ['Crimson Text', 'serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        'resume-blue': '#4a90a4',
        'resume-dark': '#0a192f',
        'resume-medium': '#1a365d',
        'resume-light': '#2d3748',
        copper: '#B87333',
        gold: '#FFD700',
        neonGreen: '#00FF99',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s infinite',
      }
    },
  },
  plugins: [],
}