// ============================================================
//  sw.js — Service Worker
//  Cache name: bump version string when you redeploy
//  e.g. "pwa-v2", "pwa-v3" — old cache gets wiped automatically
// ============================================================

const CACHE_NAME = 'pwa-v1';

// Assets to pre-cache on install (the shell)
// Add any local image paths here once you have real assets
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// ── Install: pre-cache the shell ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

// ── Activate: wipe old caches ─────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())  // take control of open tabs
  );
});

// ── Fetch: cache-first, fall back to network ──────────────────
//
//  Strategy:
//    1. Check cache first — fast, works offline
//    2. If not cached, fetch from network and cache the response
//    3. If network fails too, serve the offline fallback
//
self.addEventListener('fetch', event => {
  // Only handle GET requests — skip POST, analytics, etc.
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (Google Fonts, CDNs)
  // They have their own caching headers — let the browser handle them
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch from network
      return fetch(event.request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone: one copy for the cache, one for the browser
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, toCache);
        });

        return response;
      }).catch(() => {
        // Network failed — serve offline fallback for HTML page requests
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
