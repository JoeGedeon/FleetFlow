/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        zinc: {
          950: '#09090b', 
        },
        blue: {
          600: '#2563eb', 
        },
        green: {
          500: '#22c55e', 
          600: '#16a34a'
        }
      }
    },
  },
  plugins: [],
}


