/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f1',
          100: '#dcf1e0',
          200: '#bce2c4',
          300: '#8fcc9f',
          400: '#5eaa75',
          500: '#3e8e56',
          600: '#2e7144',
          700: '#265a39',
          800: '#20482f',
          900: '#1c3c29',
          950: '#0f2117',
        },
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
