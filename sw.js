// Simple PWA service worker for AI Assistant
// Caches the app shell for offline usage and improves reliability.

const CACHE = 'assistant-cache-v1';
const CORE = [
  './',
  './assistant.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : Promise.resolve())))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // HTML/navigation: network-first with offline fallback to cached app shell
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./assistant.html', clone));
          return res;
        })
        .catch(() => caches.match('./assistant.html'))
    );
    return;
  }

  // Static assets from same origin: cache-first with network fallback
  if (url.origin === location.origin) {
    const isStatic = /\.(?:css|js|png|jpg|jpeg|gif|svg|webp|ico|json)$/i.test(url.pathname);
    if (isStatic) {
      event.respondWith(
        caches.match(req).then((cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
            return res;
          })
        )
      );
      return;
    }
  }

  // Default: try network, fall back to cache if available
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
