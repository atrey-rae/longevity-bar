import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Kokosová / tropická paleta — vysoký kontrast, čitelné na slunci
        laguna: {
          50: "#e6f7f6",
          100: "#c2ebe9",
          200: "#8ed9d5",
          300: "#54c2bd",
          400: "#24a49e",
          500: "#0e8781",
          600: "#0a6b67",
          700: "#08544f",
          800: "#06403d",
          900: "#042b29",
        },
        mango: {
          // 300 = zlatá pro text na světlejších plochách (karta) — #ffc247
          // tam padá pod WCAG AA (4,21:1), tenhle odstín dává 4,90:1.
          300: "#ffd67e",
          400: "#ffc247",
          500: "#ffab12",
          600: "#f08c00",
        },
        zapad: {
          400: "#ff8a4c",
          500: "#ff6b35",
          600: "#e5501b",
        },
        kokos: {
          50: "#fffaf0",
          100: "#fdf3e3",
          200: "#f6e7ce",
          300: "#e8d3b2",
        },
        list: {
          500: "#25a35a",
          600: "#1b7a43",
          // Karta „Dárek přátelům" na rozcestníku — 600 by na krémový popisek
          // dala jen 4,50:1 (a 4,21:1 na eyebrow). 700 drží 5,8:1 / 5,4:1.
          700: "#166634",
        },
        inkoust: "#0b201d",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        karta: "0 18px 40px -18px rgba(4, 43, 41, 0.65)",
        tlacitko: "0 8px 0 0 rgba(0, 0, 0, 0.18)",
      },
      keyframes: {
        konfety: {
          "0%": { transform: "translate3d(0,-10vh,0) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "1" },
          "100%": { transform: "translate3d(var(--drift,0), 110vh, 0) rotate(720deg)", opacity: "0" },
        },
        popIn: {
          "0%": { transform: "scale(0.4)", opacity: "0" },
          "60%": { transform: "scale(1.12)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulsRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.85" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        plovouci: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        prelivHoni: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        skenPruh: {
          "0%": { transform: "translateY(-120%)" },
          "100%": { transform: "translateY(520%)" },
        },
      },
      animation: {
        konfety: "konfety linear forwards",
        popIn: "popIn 420ms cubic-bezier(.18,.89,.32,1.28) both",
        pulsRing: "pulsRing 1.8s ease-out infinite",
        plovouci: "plovouci 3s ease-in-out infinite",
        preliv: "prelivHoni 8s ease infinite",
        skenPruh: "skenPruh 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
