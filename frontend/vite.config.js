import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/health": "https://mockmasterai-1p9l.onrender.com",
      "/api": "https://mockmasterai-1p9l.onrender.com",
      "/generate": "https://mockmasterai-1p9l.onrender.com",
      "/mock-test": "https://mockmasterai-1p9l.onrender.com",
    },
  },
});
