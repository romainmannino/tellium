import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#e8f0ff",
        "ink-dim": "#7f93bf",
        you: "#ffc46b",
        friend: "#ff77c8",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "-apple-system", "Segoe UI", "Inter", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
