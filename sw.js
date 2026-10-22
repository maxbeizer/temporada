const CACHE = "temporada-v3";
const SHELL = ["./", "index.html", "style-v2.css", "app-v2.js", "data/crops-v2.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];
const shellURLs = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));

// Wait for existing tabs to close before activating a coherent new shell.
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    SHELL.map(path => new Request(new URL(path, self.registration.scope), { cache: "reload" }))
  )));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("temporada-") && key !== CACHE).map(key => caches.delete(key))
  )));
});

self.addEventListener("fetch", e => {
  const request = e.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  url.search = "";
  if (!shellURLs.has(url.href)) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(url.href);
    return cached || fetch(request);
  }));
});
