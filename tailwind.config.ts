import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#00C896",
          red: "#FF4D4D",
          blue: "#3B82F6",
          dark: "#0F1117",
          card: "#1A1D27",
          border: "#2A2D3A",
          muted: "#6B7280",
        },
      },
    },
  },
  plugins: [],
};

export default config;
