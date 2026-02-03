// Service Worker untuk offline support
const CACHE_NAME = "digital-desa-v1"
const urlsToCache = ["/", "/login", "/register", "/app/dashboard", "/app/penduduk", "/app/sync"]

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    }),
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event - Network first, then cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clonedResponse = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clonedResponse)
        })
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          return response || new Response("Offline - No cached data available", { status: 503 })
        })
      }),
  )
})
