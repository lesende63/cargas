// F-Class Reload Lab - service worker (offline-capable PWA)
const CACHE = "fclass-reload-v16";
const APP_SHELL = [
  "./", "./index.html", "./manifest.json", "./logo-mark.png", "./icon-192.png", "./icon-512.png", "./bg-piston.jpg",
  "./help/fase1.pdf", "./help/fase2.pdf", "./help/fase3.pdf", "./help/fase4.pdf", "./help/fase5.pdf",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(APP_SHELL.map((u) => c.add(u).catch(() => {}))))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // Precache the current HTML and its JS/CSS assets so the app loads offline
    // immediately after this (online) activation — avoids a blank page.
    try {
      const cache = await caches.open(CACHE);
      const res = await fetch("./index.html", { cache: "no-store" });
      if (res && res.ok) {
        await cache.put("./index.html", res.clone());
        const html = await res.text();
        const urls = [];
        const re = /(?:src|href)="([^"]+\.(?:js|css))"/g;
        let m;
        while ((m = re.exec(html))) urls.push(m[1]);
        await Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
      }
    } catch (e) { /* offline during activation; assets cached lazily later */ }
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.origin !== self.location.origin) return;

  // API calls always go to network (never cached).
  if (url.pathname.startsWith("/api/")) return;

  // Help PDFs: cache-first (ignore query string like ?v=) so they open offline.
  if (url.pathname.startsWith("/help/")) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) =>
        cached ||
        fetch(request).then((resp) => {
          if (resp && resp.status === 200) { const copy = resp.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
          return resp;
        })
      )
    );
    return;
  }

  // Page navigations: network-first, fall back to cached app shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((resp) => { const copy = resp.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); return resp; })
        .catch(() => caches.match(request).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // Static assets (JS/CSS/img/font): stale-while-revalidate. Never return HTML here.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((resp) => { if (resp && resp.status === 200 && resp.type === "basic") cache.put(request, resp.clone()); return resp; })
        .catch(() => null);
      return cached || (await network) || new Response("", { status: 504, statusText: "Offline" });
    })
  );
});
