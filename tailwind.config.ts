import type { Config } from "tailwindcss";

// Tailwind v4 theme is defined in app/globals.css via @theme.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
};

export default config;
