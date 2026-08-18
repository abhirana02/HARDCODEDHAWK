/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#7030EF',
        'secondary': '#DB1FFF',
        'dark-navy': '#090820',
      },
    },
  },
  plugins: [],
}