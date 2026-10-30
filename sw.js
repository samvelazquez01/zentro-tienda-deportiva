/* ============================================================
   Service Worker - SportShop PWA
   Cachea los archivos estáticos para funcionamiento offline.
   Al integrar Firebase, las peticiones a Firestore/Storage
   se dejan pasar a la red (no se cachean).
   ============================================================ */

const CACHE = "sportshop-v1";

// Archivos base de la aplicación (app shell)
const ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./css/styles.css",
  "./css/admin.css",
  "./js/data.js",
  "./js/store.js",
  "./js/app.js",
  "./js/admin.js",
  "./manifest.json",
];

// Instalación: precachea el app shell
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// Activación: limpia versiones antiguas del caché
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// Fetch: estrategia "cache first" para el app shell,
// y "network first" para el resto (útil cuando llegue Firebase).
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Dejar pasar directamente las peticiones a servicios externos (Firebase, APIs)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
