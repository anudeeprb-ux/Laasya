// Laasya School of Dance - Service Worker v8
const CACHE_NAME = 'laasya-v8';

const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './favicon.png'
];

// Install: cache all app files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: serve app files from cache, let Google API calls go straight to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept Google Apps Script - let it go direct to network
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response('{"status":"offline"}', {headers:{'Content-Type':'application/json'}})
    ));
    return;
  }

  // App files: cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// NOTE: No background sync handler - it caused infinite retry loops.
// Sync is handled by the app directly on user actions and 5s debounce after saves.
