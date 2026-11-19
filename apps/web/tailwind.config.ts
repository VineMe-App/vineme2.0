import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-pink": "#FF0083",
        "brand-dark": "#2C2235",
        "brand-beige": "#FFFBEE",
      },
    },
  },
};

export default config;
