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
        canvas: "#EEF2F6",
        navy: {
          DEFAULT: "#132238",
          light: "#1E3354",
          dark: "#0C1625",
          hover: "#192B45",
        },
        slate: {
          850: "#15202E",
          950: "#080E18",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        elevated: "0 10px 30px -5px rgba(19, 34, 56, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
