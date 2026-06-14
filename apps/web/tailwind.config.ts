import type { Config } from "tailwindcss";

const config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        mist: "#f7fafc",
        action: "#0f766e"
      }
    }
  },
  plugins: []
} satisfies Config;

export default config;
