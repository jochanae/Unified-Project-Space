// Service Worker for PWA + Push Notifications
// Bump version to force update
const CACHE_NAME = 'coinsbloom-v6';
const OFFLINE_URL = '/';
const DISABLE_CACHE = ['localhost', '127.0.0.1'].includes(self.location.hostname)
  || self.location.hostname.endsWith('.lovableproject.com')
  || self.location.hostname.startsWith('id-preview--');

const PRECACHE_URLS = [
  '/',
  '/manifest.json'
];

// Install: precache core assets
self.addEventListener('install', (event) => {
  if (DISABLE_CACHE) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches, claim clients
self.addEventListener('activate', (event) => {
  if (DISABLE_CACHE) {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith('coinsbloom-')).map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
        .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
        .then((clients) => Promise.all(clients.map((client) => client.navigate(client.url))))
    );
    return;
  }

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for navigation, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (DISABLE_CACHE) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('/~oauth')) return;

  const url = new URL(event.request.url);
  const isViteDevAsset = url.pathname.includes('/node_modules/.vite/') || url.pathname.includes('/@vite/') || url.pathname.includes('/src/');
  if (isViteDevAsset) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'CoinsBloom',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/favicon.png',
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

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetPath = event.notification.data?.url || '/';
  const urlToOpen = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});
