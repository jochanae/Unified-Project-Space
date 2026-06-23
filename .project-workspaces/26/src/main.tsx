import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Initialize Sentry for error tracking
initSentry();

// Register the PWA service worker only for production builds. In the Lovable/Vite
// preview server, cached /node_modules/.vite chunks can drift and trigger invalid
// React hook dispatcher errors such as "Cannot read properties of null".
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
        .catch((err) => console.warn('[PWA] Service Worker cleanup failed:', err));

      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.filter((key) => key.startsWith('coinsbloom-')).map((key) => caches.delete(key))))
          .catch((err) => console.warn('[PWA] Cache cleanup failed:', err));
      }
      return;
    }

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => console.log('[PWA] Service Worker registered:', reg.scope))
      .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
