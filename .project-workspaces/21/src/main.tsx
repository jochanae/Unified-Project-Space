import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initGlobalErrorReporter } from "./lib/errorReporter";
import { initSentry } from "./lib/sentry";

initSentry();
initGlobalErrorReporter();

const SW_CACHE_RESET_VERSION = 'compani-shell-reset-v3';

async function resetStaleServiceWorkerCaches() {
  if (!('caches' in window)) return;
  if (localStorage.getItem(SW_CACHE_RESET_VERSION) === 'done') return;

  const cacheKeys = await caches.keys();
  await Promise.all(
    cacheKeys
      .filter((key) => key.startsWith('compani-'))
      .map((key) => caches.delete(key))
  );

  localStorage.setItem(SW_CACHE_RESET_VERSION, 'done');
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    let reloadingForNewWorker = false;

    resetStaleServiceWorkerCaches().catch(() => {});

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update().catch(() => {});
        // No auto-reload on controllerchange — it caused double-load on every visit.
        // The service worker's network-first strategy ensures fresh content without reloading.
      })
      .catch(() => {});
  });
}

// Register service worker early so PWA install prompt fires on landing page,
// but also aggressively clear old runtime caches so deploys can't mix old/new chunks.
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
