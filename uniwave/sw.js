// uniwave: keeps station logos in the browser's cache so station lists load instantly on later visits.
const CACHE = 'uniwave-logos-v1';
const MAX = 300; // logos to keep; the oldest go first

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.destination !== 'image') return;
  const url = new URL(req.url);
  if (url.origin === location.origin || url.hostname === 'flagcdn.com') return; // own files and flags use the normal cache
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone()).then(() => trim(cache)).catch(() => {});
    return res;
  })().catch(() => fetch(req)));
});

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX; i++) await cache.delete(keys[i]);
}
