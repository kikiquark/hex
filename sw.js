// Offline support for everything the game loads (page, scripts, model).
const VERSION = "hex-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  if (e.request.mode === "navigate") {
    // the page: network first, so a new build is used right away (its scripts have new names, and an
    // old page would keep loading the old ones); the cached page only offline or on a very slow network
    e.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = () => cache.match(e.request, { ignoreSearch: true }).then((hit) => hit || Response.error());
        try {
          const r = await Promise.race([fetch(e.request), new Promise((_, no) => setTimeout(() => no(new Error("slow")), 4000))]);
          if (r.ok) cache.put(e.request, r.clone());
          return r;
        } catch {
          return cached();
        }
      }),
    );
    return;
  }
  // everything else: stale-while-revalidate, answer from the cache instantly (works offline) and
  // refresh it in the background (scripts are named by their content; the models change rarely)
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
