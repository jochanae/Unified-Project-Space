import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router-dom",
      "framer-motion",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-context",
      "@radix-ui/react-primitive",
      "@radix-ui/react-compose-refs",
      "@sentry/react",
      "@tanstack/react-query",
    ],
  },
  optimizeDeps: {
    force: true,
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@radix-ui/react-tooltip",
      "@sentry/react",
      "@tanstack/react-query",
      "framer-motion",
      "react-router-dom",
    ],
  },
}));
