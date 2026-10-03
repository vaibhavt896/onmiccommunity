// Keeps the pass usable offline after its first load (cafe wifi can be weak).
// Network-first for pass pages and static assets, falling back to the cache.
const CACHE = "onmic-pass-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const cacheable =
    url.pathname.startsWith("/pass/") ||
    url.pathname.startsWith("/api/pass/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image");
  if (!cacheable) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || Response.error())),
  );
});
