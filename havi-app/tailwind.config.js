/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // ── Fintech dark base ─────────────────────────────────
        app: {
          bg: "#000000",          // fondo principal puro negro
          surface: "#0D0D0D",     // superficies elevadas
          card: "#111111",        // cards
          cardAlt: "#161616",     // cards alternativas
          border: "#1E1E1E",      // bordes sutiles
          borderAlt: "#2A2A2A",   // bordes un poco más visibles
        },
        // ── Texto ─────────────────────────────────────────────
        ink: {
          primary: "#FFFFFF",     // texto principal
          secondary: "#AAAAAA",   // texto secundario
          muted: "#555555",       // texto muted
          inverse: "#000000",     // texto sobre fondos claros
        },
        // ── Acentos gradiente ─────────────────────────────────
        accent: {
          purple: "#A855F7",      // morado
          purpleDeep: "#7C3AED",
          blue: "#60A5FA",        // azul
          blueDeep: "#2563EB",
          green: "#34D399",       // verde
          greenDeep: "#059669",
          rose: "#FB7185",        // rosa
          roseDeep: "#E11D48",
          amber: "#FBBF24",       // ámbar
          amberDeep: "#D97706",
        },
        // ── Semánticos ────────────────────────────────────────
        status: {
          error: "#F87171",
          warning: "#FBBF24",
          success: "#34D399",
          info: "#60A5FA",
        },
        // ── Hey legacy (mantener compatibilidad) ──────────────
        hey: {
          primary: "#A855F7",     // updated a purple
          primaryLight: "#C084FC",
          bg: "#000000",
          bgAlt: "#111111",
          border: "#1E1E1E",
          text: "#FFFFFF",
          muted: "#AAAAAA",
          critico: "#F87171",
          precaucion: "#FBBF24",
          saludable: "#34D399",
          card: "#0D0D0D",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
    },
  },
  plugins: [],
};
