const CACHE_NAME = 'ryzr-v3';

// On install, clear old caches
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Always go to network — never serve stale cached pages
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
