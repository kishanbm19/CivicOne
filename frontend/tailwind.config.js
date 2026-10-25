/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#1d5ff0",
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        transport: {
          light: "#f0f7ff",
          border: "#bfdbfe",
          DEFAULT: "#2563eb",
          dark: "#1e40af",
          accent: "#0284c7",
          sidebar: "#0B192C",
        },
        municipal: {
          light: "#f0fdf4",
          border: "#bbf7d0",
          DEFAULT: "#10b981",
          dark: "#059669",
          accent: "#0d9488",
          sidebar: "#064e3b",
        },
        healthcare: {
          light: "#fff1f2",
          border: "#fecdd3",
          DEFAULT: "#f43f5e",
          dark: "#e11d48",
          accent: "#be123c",
          sidebar: "#450a0a",
        },
        gov: {
          DEFAULT: "#0f172a",
          surface: "#1e293b",
        },
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        elevated: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
