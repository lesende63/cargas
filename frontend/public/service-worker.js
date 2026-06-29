// F-Class Reload Lab - service worker (app-shell cache, network-first for API)
const CACHE = "fclass-reload-v3";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./logo-mark.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL).catch(() => {})));
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

  // App navigations: network first, fall back to cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets: cache first, then network.
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((resp) => {
          if (resp && resp.status === 200 && resp.type === "basic") {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return resp;
        }).catch(() => cached)
      );
    })
  );
});
