import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // Important: we use a SINGLE service worker for both PWA caching + push notifications
      // to avoid Chrome showing a stale cached UI while the preview shows the latest.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "service-worker.ts",
      // We register explicitly in src/main.tsx so we can control update behavior.
      injectRegister: null,
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
      },
      includeAssets: ["favicon.ico", "favicon.png", "robots.txt"],
      manifest: {
        name: "IntoIQ - Smart Money Mentor",
        short_name: "IntoIQ",
        description: "Your smart money mentor for better financial decisions",
        theme_color: "#0d9488",
        background_color: "#0a1628",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192-v2.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512-v2.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512-v2.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "Go to your dashboard",
            url: "/dashboard",
            icons: [{ src: "/pwa-192x192-v2.png", sizes: "192x192" }],
          },
          {
            name: "Ask Quinn",
            short_name: "Quinn",
            description: "Chat with your smart mentor",
            url: "/dashboard?quinn=open",
            icons: [{ src: "/pwa-192x192-v2.png", sizes: "192x192" }],
          },
          {
            name: "Trade Journal",
            short_name: "Journal",
            description: "Log and review your trades",
            url: "/journal",
            icons: [{ src: "/pwa-192x192-v2.png", sizes: "192x192" }],
          },
          {
            name: "Learn",
            short_name: "Learn",
            description: "Educational lessons and courses",
            url: "/learn",
            icons: [{ src: "/pwa-192x192-v2.png", sizes: "192x192" }],
          },
          {
            name: "Paper Trading",
            short_name: "Practice",
            description: "Practice trading with virtual money",
            url: "/paper-trading",
            icons: [{ src: "/pwa-192x192-v2.png", sizes: "192x192" }],
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
