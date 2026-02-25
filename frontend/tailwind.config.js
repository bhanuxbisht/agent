import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Source Serif 4", "serif"]
      },
      colors: {
        bg0: "#f5f3ee",
        bg1: "#fffaf0",
        ink: "#1f2430",
        pine: "#155e63",
        ember: "#b45309",
        moss: "#3f6212"
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseLine: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        riseIn: "riseIn 450ms ease-out forwards",
        pulseLine: "pulseLine 1200ms ease-in-out infinite"
      }
    }
  },
  plugins: [typography]
};
