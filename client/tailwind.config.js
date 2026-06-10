/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spektr: {
          cyan: {
            50: "#ECFEFF",
          }
        }
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  }
}
