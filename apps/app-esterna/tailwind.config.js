// apps/app-esterna/tailwind.config.js (Riconferma la correzione del percorso)

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    
    // **METODO PIÙ AFFIDABILE:** Naviga due livelli sopra per raggiungere la root e poi scendi in 'packages'
    "../../packages/shared-ui/src/**/*.{js,jsx,ts,tsx}",
    
    // Scansiona il ThemeInitializer (se lo stai mantenendo)
    "./src/ThemeInitializer.jsx", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}