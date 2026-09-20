// Lot 26 box app — lets the app open when the phone has no signal. It stores nothing the app records; that lives in the page's own storage.
// Pages: network first (so an updated app always wins when there is a connection), last good copy when there isn't.
// The two code libraries: stored copy first (their addresses are version-pinned and never change).
const CACHE = "lot26-shell-2";
const LIBS = ["https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js", "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => Promise.all(LIBS.map(u => c.add(new Request(u, { mode: "no-cors" })).catch(() => {}))))); });
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("message", e => { const p = e.data && e.data.keep; if (p) e.waitUntil(caches.open(CACHE).then(c => fetch(p, { cache: "no-store" }).then(r => r.ok && c.put(new URL(p, self.location).href, r)).catch(() => {}))); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;             // syncing (POST) is never touched
  const url = new URL(req.url), isLib = LIBS.includes(req.url), isPage = req.mode === "navigate" && url.origin === self.location.origin;
  if (!isLib && !isPage) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE), key = isPage ? url.origin + url.pathname : req.url;
    if (isLib) { const hit = await cache.match(key); if (hit) return hit; }
    try {
      const fresh = await Promise.race([isPage ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req), new Promise((_, no) => setTimeout(() => no(new Error("slow")), isPage ? 4000 : 10000))]);
      if (fresh && (fresh.ok || fresh.type === "opaque")) cache.put(key, fresh.clone());
      return fresh;
    } catch (err) { const hit = await cache.match(key); if (hit) return hit; throw err; }
  })());
});
