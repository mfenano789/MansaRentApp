/** @type {import('tailwindcss').Config} */
// MansaRent — palette « Mansa » (héritage mandingue · Guinée)
// On remappe les échelles Tailwind utilisées dans toute l'app :
//   teal  -> émeraude guinéenne (couleur primaire, confiance)
//   amber -> or royal (accent « Mansa »)
//   gray  -> neutres sable/pierre chauds
// green (WhatsApp) et rose (favoris) restent les couleurs par défaut.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          50: "#edf6f0",
          100: "#d3ebdd",
          200: "#a6d7bd",
          300: "#71bd97",
          400: "#3f9d73",
          500: "#1c8055",
          600: "#0e6c46",
          700: "#0b5a3a",
          800: "#0a472f",
          900: "#093a28",
        },
        amber: {
          50: "#fdf6e0",
          100: "#fbe9b4",
          200: "#f5d575",
          300: "#edc043",
          400: "#e0a91c",
          500: "#d49405",
          600: "#b07505",
          700: "#8a5b0a",
          800: "#6d480e",
          900: "#5a3c10",
        },
        gray: {
          50: "#f8f7f3",
          100: "#efece5",
          200: "#e2ddd2",
          300: "#cbc5b6",
          400: "#a39c8b",
          500: "#756e5d",
          600: "#595342",
          700: "#423d30",
          800: "#2e2a20",
          900: "#1c1913",
        },
      },
    },
  },
  plugins: [],
};
