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
        canvas: "#0D1117",
        navy: {
          DEFAULT: "#1A2E4A",
          light: "#243D60",
          dark: "#0D1A2A",
          hover: "#1E3558",
        },
        slate: {
          850: "#1C2535",
          950: "#F0F5FA",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.35), 0 1px 2px 0 rgba(0, 0, 0, 0.25)",
        elevated: "0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 4px 12px -4px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
