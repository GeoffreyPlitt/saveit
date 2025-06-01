/**
 * SaveIt PWA Service Worker
 * Handles share targets and forwards to webhook
 */

// Cache name for PWA assets
const CACHE_NAME = 'saveit-cache-v1';

// Files to cache
const CACHE_FILES = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-128.png'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(CACHE_FILES);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch event - handle share target and cache strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle share target
  if (url.pathname.endsWith('/share-target') && event.request.method === 'POST') {
    event.respondWith(handleShare(event.request));
    return;
  }
  
  // Cache-first strategy for other requests
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

/**
 * Handle share target request - Stub implementation for Milestone 1
 * Will be fully implemented in Milestone 3
 * @param {Request} request - The share target request
 * @returns {Promise<Response>} - Redirects back to home page
 */
async function handleShare(request) {
  try {
    console.log('Share target received - will be implemented in Milestone 3');
  } catch (error) {
    console.error('Error in share handler:', error);
  }
  
  // Always redirect back to home page
  return Response.redirect('./', 303);
}
