/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
      colors: {
        ink: "#17202a",
        glacier: "#dceaf2",
        fjord: "#1f5f73",
        pine: "#2c5c4d",
        aurora: "#3a7d7a",
        ledger: "#f5f7f8",
      },
      boxShadow: {
        panel: "0 16px 40px rgba(23, 32, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
