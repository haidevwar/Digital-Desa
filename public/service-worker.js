// Service Worker untuk offline support - Digital Desa
const CACHE_NAME = "digital-desa-v2"
const STATIC_CACHE = "digital-desa-static-v2"
const API_CACHE = "digital-desa-api-v2"

// Static assets to cache
const STATIC_ASSETS = [
  "/",
  "/login",
  "/register",
  "/app/dashboard",
  "/app/penduduk",
  "/app/sync",
]

// API routes that should use cache-first strategy when offline
const CACHEABLE_API_ROUTES = [
  "/api/penduduk",
  "/api/sync/status",
]

// Install event - Cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.log("Service Worker: Failed to cache some static assets", err)
        })
      }),
    ])
  )
  self.skipWaiting()
})

// Activate event - Clean up old caches
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE]
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log("Service Worker: Deleting old cache", cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - Handle offline scenarios
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests (POST, PUT, DELETE should go through normally or fail)
  if (request.method !== "GET") {
    return
  }

  // Skip external requests
  if (!url.origin.includes(self.location.origin)) {
    return
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    // For cacheable API routes, use stale-while-revalidate
    const isCacheableApi = CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route))
    
    if (isCacheableApi) {
      event.respondWith(
        caches.open(API_CACHE).then(async (cache) => {
          try {
            // Try network first
            const networkResponse = await fetch(request)
            
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone())
            }
            
            return networkResponse
          } catch (error) {
            // Network failed, try cache
            const cachedResponse = await cache.match(request)
            
            if (cachedResponse) {
              return cachedResponse
            }
            
            // Return offline error for API
            return new Response(
              JSON.stringify({ 
                error: "Offline", 
                offline: true,
                message: "Data dari cache tidak tersedia. Silakan hubungkan ke internet."
              }),
              { 
                status: 503, 
                headers: { "Content-Type": "application/json" }
              }
            )
          }
        })
      )
      return
    }
    
    // For other API routes, just try network
    return
  }

  // Handle static assets and pages - Network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clonedResponse = response.clone()
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, clonedResponse)
          })
        }
        return response
      })
      .catch(async () => {
        // Network failed, try cache
        const cachedResponse = await caches.match(request)
        
        if (cachedResponse) {
          return cachedResponse
        }
        
        // For navigation requests, return the cached index/login page
        if (request.mode === "navigate") {
          const cachedPage = await caches.match("/login") || await caches.match("/")
          if (cachedPage) {
            return cachedPage
          }
        }
        
        // Return offline page
        return new Response(
          `<!DOCTYPE html>
          <html>
          <head>
            <title>Offline - Digital Desa</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: system-ui, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                margin: 0;
                background: #f3f4f6;
              }
              .container { 
                text-align: center; 
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 { color: #1f2937; margin-bottom: 0.5rem; }
              p { color: #6b7280; }
              button {
                margin-top: 1rem;
                padding: 0.75rem 1.5rem;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
              }
              button:hover { background: #2563eb; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Anda Sedang Offline</h1>
              <p>Halaman ini tidak tersedia dalam cache.</p>
              <p>Silakan periksa koneksi internet Anda.</p>
              <button onclick="location.reload()">Coba Lagi</button>
            </div>
          </body>
          </html>`,
          { 
            status: 503, 
            headers: { "Content-Type": "text/html" }
          }
        )
      })
  )
})

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName)
      })
    })
  }
})
