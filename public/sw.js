// Service worker: caches the app shell so Community App installs and works offline.
// Bump VERSION whenever the files change so visitors get the update.
const VERSION = 'community-app-v4';
const SHELL = [
  './', 'index.html', 'styles.css?v=4', 'app.js?v=4', 'js/store.js?v=4', 'js/galaxy.js?v=4', 'js/graph.js?v=4',
  'favicon.svg', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network first (so updates show up right away), falling back to the cache when offline.
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && (new URL(request.url).origin === self.location.origin || request.url.includes('fonts.g'))) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((hit) => hit || (request.mode === 'navigate' ? caches.match('index.html') : undefined)))
  );
});
