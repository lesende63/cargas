// F-Class Reload Lab - service worker (network-first, cache fallback for offline)
const CACHE = "fclass-reload-v5";
const APP_SHELL = [
  "./", "./index.html", "./manifest.json", "./logo-mark.png", "./icon-192.png", "./icon-512.png",
  "./help/fase1.pdf", "./help/fase2.pdf", "./help/fase3.pdf", "./help/fase4.pdf", "./help/fase5.pdf",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // Cache each asset individually so one failure does not abort the whole precache.
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(APP_SHELL.map((u) => c.add(u).catch(() => {}))))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Only handle same-origin http(s) requests. Never intercept blob:/data:/chrome-extension:
  // schemes — intercepting blob: URLs breaks file downloads (JSON export) in installed PWAs.
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.origin !== self.location.origin) return;

  // Never cache API calls — always go to network.
  if (url.pathname.startsWith("/api/")) return;

  // Help PDFs: cache-first so they always open offline (ignore query string like ?v=).
  if (url.pathname.startsWith("/help/")) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) =>
        cached ||
        fetch(request).then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return resp;
        })
      )
    );
    return;
  }

  // Network-first for everything else same-origin: always fresh when online, fall
  // back to cache when offline. (Cache-first served stale JS bundles and broke updates.)
  event.respondWith(
    fetch(request)
      .then((resp) => {
        if (resp && resp.status === 200 && resp.type === "basic") {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return resp;
      })
      .catch(() => caches.match(request).then((cached) => cached || (request.mode === "navigate" ? caches.match("./index.html") : undefined)))
  );
});
