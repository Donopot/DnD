// Service Worker — D&D Virtual Tabletop
// Stratégie : Network First avec fallback cache pour les assets statiques,
// Cache First pour les icônes/fonts.

const CACHE_VERSION = "dnd-vtt-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const PRECACHE_URLS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

// Install — precache les assets essentiels
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

// Activate — nettoie les vieux caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== IMAGE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch — Network First pour HTML/API, Cache First pour assets statiques
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API calls — Network only (ne pas mettre en cache les données dynamiques)
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws/")) {
    return;
  }

  // Images et fonts — Cache First
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => cache.put(request, clone));
            return response;
          }),
      ),
    );
    return;
  }

  // HTML et assets JS/CSS — Network First avec fallback cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
