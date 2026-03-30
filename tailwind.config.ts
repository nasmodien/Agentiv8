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
        DEFAULT: "10px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06)",
        lg: "0 4px 24px rgba(0,0,0,.12)",
      },
    },
  },
  plugins: [],
};
export default config;
