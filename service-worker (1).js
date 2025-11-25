const CACHE_NAME = 'fredagsdrinken-v6';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './recipes.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode === 'navigate' || request.url.endsWith('/recipes.json')) {
    event.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, copy));
        return res;
      }).catch(() => caches.match(request).then(m => m || caches.match('./')))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(request, copy));
      return res;
    }))
  );
});
