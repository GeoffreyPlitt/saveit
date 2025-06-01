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
 * Read a setting from IndexedDB
 * @param {string} key - The key to read
 * @returns {Promise<any>} - The stored value
 */
function readFromIDB(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('saveit-db', 1);
    
    request.onerror = event => {
      reject(`Error opening database: ${event.target.error}`);
    };
    
    request.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          resolve(getRequest.result.value);
        } else {
          resolve(null);
        }
      };
      
      getRequest.onerror = event => {
        reject(`Error reading from database: ${event.target.error}`);
      };
    };
  });
}

/**
 * Show a toast notification by sending a message to all clients
 * @param {string} message - Message to display
 * @param {string} type - Toast type ('success' or 'error')
 */
async function showToast(message, toastType = 'success') {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SHOW_TOAST',
      message,
      toastType
    });
  });
}

/**
 * Handle share target request - Stub implementation for Milestone 2
 * Will be fully implemented in Milestone 3
 * @param {Request} request - The share target request
 * @returns {Promise<Response>} - Redirects back to home page
 */
async function handleShare(request) {
  try {
    console.log('Share target received - will be implemented in Milestone 3');
    
    // Check if webhook is configured
    const webhook = await readFromIDB('webhook');
    const token = await readFromIDB('token');
    
    if (!webhook || !token) {
      // Show a toast message that the webhook is not configured
      await showToast('Please configure your webhook settings first', 'error');
    } else {
      // This is just a test for Milestone 2
      console.log(`Settings found - Webhook: ${webhook.substring(0, 10)}..., Token: ${token ? 'configured' : 'missing'}`);
      await showToast('Share received, webhook configured (will be processed in Milestone 3)', 'success');
    }
  } catch (error) {
    console.error('Error in share handler:', error);
    await showToast('Error processing share', 'error');
  }
  
  // Always redirect back to home page
  return Response.redirect('./', 303);
}
