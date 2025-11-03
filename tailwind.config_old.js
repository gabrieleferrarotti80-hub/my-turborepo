/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // Scansiona TUTTI i file rilevanti all'interno delle cartelle 'apps' e 'packages'
    "./apps/**/*.{js,ts,jsx,tsx}",
    "./packages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};