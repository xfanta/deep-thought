const CACHE_NAME = "deep-thought-ai-v5";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css", 
  "./script-simple.js",
  "./config.js",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});