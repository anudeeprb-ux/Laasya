// Laasya School of Dance - Service Worker
// Version bump this string any time you update the app
const CACHE_NAME = 'laasya-v1';

// All files the app needs to work offline
const CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png'
];

// ── Install: cache all app files ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: serve from cache, fall back to network ────────────────────────
// For Google Apps Script calls (sync): always go network, never cache
// For app files: cache first, then network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept Google Apps Script requests - let them go straight to network
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(event.request).catch(() => {
      // Offline - sync will retry when back online (handled in app)
      return new Response(JSON.stringify({status: 'offline'}), {
        headers: {'Content-Type': 'application/json'}
      });
    }));
    return;
  }

  // App files - cache first strategy
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses for app files
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline and not in cache - return offline page if available
        return caches.match('/index.html');
      });
    })
  );
});

// ── Background sync (when back online after being offline) ────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'laasya-sync') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_NOW' });
        });
      })
    );
  }
});

// ── Push: notify clients when update is available ─────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
