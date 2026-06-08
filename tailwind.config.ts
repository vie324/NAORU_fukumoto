import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0f766e",
          dark: "#0d5d56",
          light: "#14b8a6",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
