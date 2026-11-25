/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        // Midnight-navy foundation
        canvas: "#F6F7FA",
        surface: "#FFFFFF",
        edge: "#E6E8EC",
        ink: { 900: "#141B2D", 700: "#33415C", 500: "#5B6B84", 300: "#93A1B5" },
        // Deep indigo brand with electric blue accents
        brand: {
          DEFAULT: "#4F46E5",
          50: "#EEF2FF",
          100: "#E0E7FF",
          500: "#4F46E5",
          600: "#4338CA",
          700: "#3730A3",
          800: "#312E81",
        },
        info: { 50: "#EFF8FF", 100: "#DBEAFE", 400: "#2E90FA", 600: "#1D6FD1", 700: "#175CA8" },
        violet: { 50: "#F5F3FF", 100: "#EDE9FE", 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED" },
        success: { 50: "#ECFDF3", 100: "#D1FADF", 600: "#0E9F6E", 700: "#047857" },
        warning: { 50: "#FFFAEB", 100: "#FEEBC7", 500: "#F79009", 600: "#DC6803", 700: "#B45309" },
        danger: { 50: "#FEF3F2", 100: "#FEE4E2", 500: "#F04438", 600: "#D92D20", 700: "#B42318", 800: "#8C1B12" },
        navy: {
          50: "#F4F6FB",
          100: "#E4E9F6",
          200: "#C7D2E8",
          300: "#93A5C6",
          400: "#5B74A8",
          500: "#33415C",
          600: "#1B2540",
          700: "#131B30",
          800: "#0C1222",
          900: "#080D18",
        },
      },
      boxShadow: {
        xs: "0 1px 2px rgba(20, 27, 45, 0.06)",
        sm: "0 1px 3px rgba(20, 27, 45, 0.08)",
        md: "0 4px 12px -2px rgba(20, 27, 45, 0.10)",
        lg: "0 12px 32px -8px rgba(20, 27, 45, 0.18)",
        xl: "0 24px 48px -16px rgba(20, 27, 45, 0.25)",
      },
      borderRadius: {
        lg: "10px",
        lg2: "14px",
        xl2: "18px",
      },
    },
  },
  plugins: [],
};
