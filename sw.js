/* NAVigating Business service worker.
   Strategy:
     - Art bundles are large and effectively immutable -> cache first.
     - Everything else -> network first, falling back to cache when offline.
   Bump CACHE_VERSION whenever a release should discard old cached assets,
   and bump ?v= in index.html at the same time. */

const CACHE_VERSION = 'nb-2026-09-23-m';
const ART_ASSETS = ['art-core.js', 'art-merge.js', 'art-v47.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(ART_ASSETS.map((f) => new Request(f, { cache: 'reload' }))))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* The manifest must never be served stale, or a newly added asset
     silently fails to appear. */
  if (url.pathname.endsWith('art/manifest.json')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  const isArt = ART_ASSETS.some((f) => url.pathname.endsWith(f));

  if (isArt) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => undefined);
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => undefined);
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
  );
});
