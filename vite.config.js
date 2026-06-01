import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/ai-nordic-travel-advisor/",
  plugins: [react()],
  server: {
    allowedHosts: true,
    host: "0.0.0.0",
  },
});
