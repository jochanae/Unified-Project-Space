/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'serif']
      },
      colors: {
        obsidian: {
          950: '#06060a',
          900: '#0a0a12',
          800: '#0f0f1a',
          700: '#141422',
          600: '#1a1a2e'
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706'
        }
      }
    }
  },
  plugins: []
}