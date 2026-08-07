/// <reference lib="webworker" />

const CACHE_NAME = 'famnme-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  (self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

// Fetch - network first, fallback to cache for GET requests
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;

  // Skip non-GET and API requests
  if (request.method !== 'GET' || request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then(r => r || new Response('Offline', { status: 503 })))
  );
});

export {};
