/* SanctumIQ service worker — push delivery + offline shell.
 *
 * Two responsibilities:
 *   1. Web Push: receive push events, surface OS notifications, route clicks.
 *      Notifications carry HMAC-signed action buttons ("Mark read", "Dismiss").
 *   2. Offline: cache the app shell, serve scripture.json from cache-first,
 *      fall back to cached HTML for navigations when offline.
 *
 * Update strategy: NEW versions install in the background, then wait. The
 * client gets a "skipWaiting" message to activate the new SW; this is what
 * powers the "New version available — tap to refresh" prompt in the UI.
 *
 * IMPORTANT: bump SW_VERSION any time the cache strategy or notification
 * surface changes so clients get the new behavior on next visit.
 */

const SW_VERSION = "v5";
const SHELL_CACHE = `sanctum-shell-${SW_VERSION}`;
const SCRIPTURE_CACHE = `sanctum-scripture-${SW_VERSION}`;

// Files we want available offline immediately. We deliberately do NOT
// precache JS/CSS bundles (they're hashed and change every deploy). The
// runtime fetch handler will populate the shell cache for navigation
// fallback as the user visits pages online.
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/sanctum-seal.svg",
  "/sanctum-seal-maskable.svg",
  "/favicon.svg",
];

// ---------- Lifecycle ------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn("[sw] precache miss:", url, err)),
        ),
      );
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("sanctum-") && !k.endsWith(SW_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ---------- Fetch strategy ------------------------------------------------

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_") ||
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/__") ||
    url.pathname.startsWith("/~oauth") ||
    url.pathname === "/auth" ||
    url.pathname.startsWith("/auth/")
  ) {
    return;
  }

  if (url.pathname === "/bible/scripture.json") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SCRIPTURE_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        return cached || (await network) || new Response("[]", { status: 503 });
      })(),
    );
    return;
  }

  const isNav = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isNav) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = (await cache.match(req)) || (await cache.match("/"));
          if (cached) return cached;
          return new Response(
            "<h1>Offline</h1><p>This page hasn't been visited yet, so it isn't available offline.</p>",
            { status: 503, headers: { "Content-Type": "text/html" } },
          );
        }
      })(),
    );
    return;
  }
});

// ---------- Push delivery -------------------------------------------------

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: "SanctumIQ", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "SanctumIQ";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || payload.id || "sanctum",
    data: {
      url: payload.url || "/notifications",
      id: payload.id || null,
      sig: payload.sig || null,
    },
    silent: payload.silent === true,
    requireInteraction: false,
    // Action buttons — supported on Chrome/Edge/Android. iOS Safari ignores
    // and just shows the body click target, which still works.
    actions: [
      { action: "read", title: "Mark read" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;

  // Dismiss is a no-op beyond closing the notification.
  if (action === "dismiss") {
    return;
  }

  // Mark read: fire-and-forget POST to the public mark-read endpoint with
  // the HMAC sig the server embedded in the push payload. No app focus.
  if (action === "read") {
    if (data.id && data.sig) {
      event.waitUntil(
        fetch("/api/public/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: data.id, sig: data.sig }),
        }).catch((err) => console.warn("[sw] mark-read failed:", err)),
      );
    }
    return;
  }

  // Default click (no action) — open or focus the app at the notification's url.
  const url = data.url || "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            try {
              client.navigate(url);
            } catch (_) {}
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});
