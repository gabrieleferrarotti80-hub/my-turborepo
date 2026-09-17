const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    path.join(__dirname, "../../packages/shared-ui/**/*.{js,ts,jsx,tsx}")
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}