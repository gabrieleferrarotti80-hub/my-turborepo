// Percorso: apps/gestionale/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // 1. Includi i file della tua app 'gestionale'
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    
    // 2. Includi i componenti dal pacchetto 'shared-ui'
    "../../packages/shared-ui/src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}