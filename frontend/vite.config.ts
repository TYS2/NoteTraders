import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/signup": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/login": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/updateUser": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/addBalance": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/withdrawBalance": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/purchaseListing": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/transactions": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/createListing": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/updateListing": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/deleteListing": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/listings": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/users": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});