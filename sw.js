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
  'icons/icon-512.png',
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
      .then(() => {
        // Activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => {
            return cacheName !== CACHE_NAME;
          }).map(cacheName => {
            return caches.delete(cacheName);
          })
        );
      }),
      // Claim any clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - handle share target and cache strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle share target
  if (url.pathname.endsWith('/share-target') && event.request.method === 'POST') {
    // Check if FormData is available and functioning correctly
    if (typeof FormData !== 'undefined') {
      event.respondWith(handleShare(event.request));
    } else {
      // Redirect with an error if FormData is not supported
      event.respondWith(Response.redirect('./?error=formdata-not-supported', 303));
    }
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
 * Read a setting from storage (IndexedDB with localStorage fallback)
 * @param {string} key - The key to read
 * @returns {Promise<any>} - The stored value
 */
async function readFromStorage(key) {
  try {
    // Try IndexedDB first
    return await readFromIDB(key);
  } catch (error) {
    console.warn('IndexedDB failed, trying localStorage:', error);
    // Fall back to localStorage
    return readFromLocalStorage(key);
  }
}

/**
 * Read a setting from IndexedDB
 * @param {string} key - The key to read
 * @returns {Promise<any>} - The stored value
 */
function readFromIDB(key) {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('saveit-db', 1);
      
      request.onerror = event => {
        reject(`Error opening database: ${event.target.error}`);
      };
      
      request.onsuccess = event => {
        const db = event.target.result;
        try {
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
        } catch (txError) {
          reject(`Transaction error: ${txError}`);
        }
      };
      
      request.onblocked = () => {
        reject('Database access blocked');
      };
    } catch (err) {
      reject(`IndexedDB access failed: ${err}`);
    }
  });
}

/**
 * Read from localStorage
 * @param {string} key - The key to read
 * @returns {string|null} - The stored value
 */
function readFromLocalStorage(key) {
  // We can't access localStorage directly in a service worker
  // This function will be used in the fetch handler
  // where we can access clients and use a message to get the data
  // For now, just return null
  return null;
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
 * Handle share target request
 * @param {Request} request - The share target request
 * @returns {Promise<Response>} - Returns a response without redirecting for unconfigured webhook
 */
async function handleShare(request) {
  try {
    // Check if webhook is configured
    const webhook = await readFromStorage('webhook');
    const token = await readFromStorage('token');
    
    if (!webhook || !token) {
      // Instead of redirecting, show a system toast and stay in the current app
      // This uses Android's notification system rather than our own UI
      await showToast('Error: No webhook configured. Please open SaveIt app and configure one.', 'error');
      
      // Return a simple response indicating configuration is needed, but don't redirect
      return new Response('Configuration required', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
    
    // Clone the request to extract form data
    const formData = await request.formData();
    
    // Extract shared data
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    const url = formData.get('url') || '';
    
    // Create payload with timestamp
    const payload = {
      title,
      text,
      url,
      timestamp: new Date().toISOString()
    };
    
    // Log the received data (only in development)
    console.log('Share received:', payload);
    
    // Check for network connectivity
    if (!navigator.onLine) {
      await showToast('You are offline. Cannot send to webhook.', 'error');
      // TODO: Could implement a background sync queue here in a future version
      return Response.redirect('./', 303);
    }
    
    // Send to webhook
    try {
      console.log(`Sending to webhook: ${webhook.substring(0, 30)}...`);
      
      const response = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        // Add a reasonable timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        // Log success details
        console.log(`Webhook response: ${response.status}`);
        await showToast('Content successfully sent to webhook', 'success');
      } else {
        const errorText = await response.text().catch(e => 'Could not read error details');
        console.error('Webhook error:', response.status, errorText);
        
        // More descriptive error messages based on status codes
        let errorMessage;
        switch(response.status) {
          case 401:
          case 403:
            errorMessage = 'Authentication failed. Check your token.';
            break;
          case 404:
            errorMessage = 'Webhook URL not found. Verify the URL is correct.';
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = 'Server error at webhook endpoint.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please try again later.';
            break;
          default:
            errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        
        await showToast(errorMessage, 'error');
      }
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      
      // More specific error messages
      let errorMessage = 'Failed to connect to webhook.';
      if (fetchError.name === 'AbortError') {
        errorMessage = 'Request timed out. Your webhook took too long to respond.';
      } else if (fetchError.message && fetchError.message.includes('CORS')) {
        errorMessage = 'CORS error. Your webhook must allow requests from this origin.';
      } else if (!navigator.onLine) {
        errorMessage = 'You are offline. Cannot send to webhook.';
      }
      
      await showToast(errorMessage, 'error');
    }
    
    // Only redirect on success - keeps user in their current app otherwise
    return Response.redirect('./', 303);
  } catch (error) {
    console.error('Error in share handler:', error);
    await showToast('Error processing share', 'error');
    
    // Return an error response, but don't redirect
    return new Response('Error processing share', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}
