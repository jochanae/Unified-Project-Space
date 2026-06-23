/// <reference no-default-lib="true" />
/// <reference lib="webworker" />

// Single service worker for BOTH:
// 1) PWA caching/updates (Workbox)
// 2) Push notifications (IntoIQ)
//
// This avoids a common production issue where Chrome keeps an old cached UI
// while the preview shows the latest.

import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string }>;
};

// Take control ASAP so updates apply immediately.
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Precache build assets.
precacheAndRoute(self.__WB_MANIFEST);

// Cache Google Fonts.
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "gstatic-fonts-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

// --------------------
// Push notifications
// --------------------
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data: any;
  try {
    data = event.data.json();
  } catch {
    data = { title: "IntoIQ", body: event.data.text() };
  }

  // TS lib types vary by browser; keep this permissive.
  const options: any = {
    body: data.body || data.message,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [100, 50, 100],
    data: {
      url: data.action_url || data.url || "/",
      notificationId: data.id,
    },
    actions:
      data.actions || [
        { action: "open", title: "Open" },
        { action: "dismiss", title: "Dismiss" },
      ],
    tag: data.tag || "default",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title || "IntoIQ", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = (event.notification as any).data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  // optional: analytics/cleanup
  console.log("Notification closed:", event.notification.tag);
});
