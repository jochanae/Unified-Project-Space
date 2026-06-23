// Service Worker for PWA + Push Notifications — Compani
// IMPORTANT: never runtime-cache JS chunks or backend/data requests.
// Caching those can mix old/new deploy artifacts and crash React after publish.
const CACHE_NAME = 'compani-shell-v4';
const OFFLINE_URL = '/';
const STATIC_URLS = [
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept cross-origin requests (backend, auth, storage, third-party APIs).
  if (url.origin !== self.location.origin) return;

  // OAuth callback flow should stay fully network-driven.
  if (url.pathname.includes('/~oauth')) return;

  // Never cache build artifacts or source maps — stale chunks can cause React hook crashes.
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.map') ||
    url.pathname.endsWith('.json')
  ) {
    return;
  }

  // Navigation requests: network-first, offline shell fallback only.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) return response;
          return caches.match(OFFLINE_URL).then((cached) => cached || response);
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Small same-origin static files only.
  if (
    url.pathname === '/favicon.ico' ||
    url.pathname === '/icon-192.png' ||
    url.pathname === '/icon-512.png'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Compani',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/favicon.ico',
    tag: 'default',
    data: { url: '/' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error('[SW] Push parse error:', e);
  }

  const isReminder = data.tag === 'companion_reminder' && data.data?.reminder_id;
  const notificationOptions = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: isReminder
      ? [
          { action: 'reminder_done', title: '✓ Done' },
          { action: 'reminder_snooze', title: '⏰ Snooze 24h' },
          { action: 'reminder_dismiss', title: '🗑 Not relevant' },
        ]
      : [
          { action: 'open', title: 'Open' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
  };

  if (data.image) {
    notificationOptions.image = data.image;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

const REMINDER_ACTION_MAP = {
  reminder_done: 'done',
  reminder_snooze: 'snooze',
  reminder_dismiss: 'dismiss',
};

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const dataPayload = event.notification.data || {};

  if (action === 'dismiss') return;

  // Reminder action buttons → call edge function, no UI navigation
  if (REMINDER_ACTION_MAP[action] && dataPayload.reminder_id && dataPayload.action_url && dataPayload.token && dataPayload.user_id) {
    event.waitUntil(
      fetch(dataPayload.action_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder_id: dataPayload.reminder_id,
          user_id: dataPayload.user_id,
          token: dataPayload.token,
          action: REMINDER_ACTION_MAP[action],
        }),
      }).catch((err) => console.error('[SW] reminder action failed:', err))
    );
    return;
  }

  const targetPath = event.notification.data?.url || '/';
  const urlToOpen = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});
