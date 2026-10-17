/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  PURENOTES — OFFLINE-FIRST PROGRESSIVE WEB APP SERVICE WORKER (sw.js)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CACHE_NAME = 'purenotes-shell-v1';
const RUNTIME_CACHE = 'purenotes-runtime-v1';

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/manifest.json'
];

// Install: Pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of APP_SHELL_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          // Ignore individual asset failure during install so SW still activates
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Offline-first strategy for App Shell & static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Network-first with cache fallback for dynamic share API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // SPA Navigation requests (e.g. /, /index.html, /s/[id]): Offline-first with network update
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cachedIndex) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.ok && url.origin === self.location.origin) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
            }
            return response;
          })
          .catch(() => cachedIndex || caches.match('/'));

        return cachedIndex || networkFetch;
      })
    );
    return;
  }

  // Static assets (CSS, JS, Manifest, Fonts, CDN scripts): Cache-first with background refresh
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Refresh cache in the background when online
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const targetCache = url.origin === self.location.origin ? CACHE_NAME : RUNTIME_CACHE;
              caches.open(targetCache).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || (!networkResponse.ok && networkResponse.type !== 'opaque')) {
            return networkResponse;
          }
          const clone = networkResponse.clone();
          const targetCache = url.origin === self.location.origin ? CACHE_NAME : RUNTIME_CACHE;
          caches.open(targetCache).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() => {
          if (request.destination === 'document') {
            return caches.match('/index.html') || caches.match('/');
          }
          return new Response('', { status: 408, statusText: 'Offline' });
        });
    })
  );
});
