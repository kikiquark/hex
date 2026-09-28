// Offline support for everything the game loads (page, scripts, model).
const VERSION = "hex-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  // stale-while-revalidate: answer from the cache instantly (works offline),
  // refresh it in the background so a new build or model arrives on the next launch
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(e.request);
      const fresh = fetch(e.request)
        .then((r) => { if (r.ok) cache.put(e.request, r.clone()); return r; })
        .catch(() => hit || Response.error());
      return hit || fresh;
    }),
  );
});
