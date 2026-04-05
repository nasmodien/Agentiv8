import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          DEFAULT: "#1a2744",
          light: "#243256",
          mid: "#1e2d4f",
        },
        blue: {
          DEFAULT: "#2563eb",
          light: "#3b82f6",
          subtle: "#eff6ff",
        },
        green: {
          DEFAULT: "#16a34a",
          light: "#22c55e",
        },
        red: {
          DEFAULT: "#dc2626",
        },
        orange: {
          DEFAULT: "#ea580c",
        },
        yellow: {
          DEFAULT: "#ca8a04",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "14px",
        sm: "8px",
        md: "10px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(26,39,68,.05), 0 6px 20px rgba(26,39,68,.07)",
        lg: "0 4px 32px rgba(26,39,68,.14)",
        sidebar: "4px 0 20px rgba(26,39,68,.06)",
      },
    },
  },
  plugins: [],
};
export default config;
