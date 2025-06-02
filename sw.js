/**
 * SaveIt PWA Service Worker
 * Handles share targets and forwards to webhook
 * Version: 1.1 - Updated error handling
 */

// Cache name for PWA assets - increment version to force update
const CACHE_NAME = 'saveit-cache-v3';
const SW_VERSION = '1.2';

console.log(`Service Worker ${SW_VERSION} loaded, using cache: ${CACHE_NAME}`);

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
      self.clients.claim().then(() => {
        // Broadcast version to all clients after claiming them
        return broadcastVersionToClients();
      })
    ])
  );
});

// Handle messages from the main app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - handle share target and cache strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // More robust share target detection
  const isShareTarget = (url.pathname === '/share-target' || 
                        url.pathname === './share-target' || 
                        url.pathname.endsWith('/share-target') ||
                        url.pathname === 'share-target') && 
                       event.request.method === 'POST';
  
  // Add some debugging
  console.log('SW Fetch intercepted:', url.pathname, event.request.method, 'isShareTarget:', isShareTarget);
  
  // Handle share target
  if (isShareTarget) {
    console.log('Handling share target request');
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
 * @returns {Promise<Response>} - Returns a response that completes the share action
 */
async function handleShare(request) {
  try {
    console.log(`handleShare called - SW version ${SW_VERSION} - checking webhook configuration`);
    
    // Check if webhook is configured
    const webhook = await readFromStorage('webhook');
    const token = await readFromStorage('token');
    
    console.log('Webhook configured:', !!webhook, 'Token configured:', !!token);
    
    // Check notification permission
    const hasNotificationPermission = 'Notification' in self && self.Notification.permission === 'granted';
    console.log('Notification permission granted:', hasNotificationPermission);
    
    // If missing webhook OR notification permission, redirect to onboarding
    if (!webhook || !token || !hasNotificationPermission) {
      console.log('Missing webhook or notification permission - redirecting to onboarding');
      
      // Build redirect URL with appropriate parameters
      let redirectUrl = './?firstShare=true';
      
      if (!webhook || !token) {
        redirectUrl += '&needsWebhook=true';
      }
      
      if (!hasNotificationPermission) {
        redirectUrl += '&needsPermission=true';
      }
      
      console.log('Redirecting to:', redirectUrl);
      
      // Redirect to main app for onboarding
      return Response.redirect(redirectUrl, 303);
    }
    
    // If we get here, both webhook and permission are configured
    // Clone the request to extract form data
    const formData = await request.formData();
    
    // Extract shared data
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    const url = formData.get('url') || '';
    
    // Create payload with timestamp
    // Note: Android share typically puts the URL in the 'text' field, not 'url' field
    const payload = {
      url: text || url, // Use text field as URL (Android share behavior)
      title,
      timestamp: new Date().toISOString()
    };
    
    // Log the received data (only in development)
    console.log('Share received:', payload);
    
    // Check for network connectivity
    if (!navigator.onLine) {
      console.log('Device is offline, showing error notification');
      
      const errorMessage = 'You are offline. Cannot send to webhook.';
      let redirectUrl = `./?webhookError=true&errorMessage=${encodeURIComponent(errorMessage)}&errorType=offline`;
      
      console.log('Redirecting to main app with offline error info:', redirectUrl);
      
      // Try to show notification, but handle permission gracefully
      try {
        if ('Notification' in self && self.Notification.permission === 'granted') {
          await self.registration.showNotification('SaveIt Error', {
            body: errorMessage,
            icon: './icons/icon-192.png',
            requireInteraction: true,
            tag: 'saveit-offline-error'
          });
        } else {
          console.log('No notification permission - cannot show offline notification');
        }
      } catch (notificationError) {
        console.error('Failed to show offline notification:', notificationError);
      }
      
      // Redirect to main app to show error in UI
      return Response.redirect(redirectUrl, 303);
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
        
        // Show a temporary success notification (will disappear after 5 seconds)
        try {
          if ('Notification' in self && self.Notification.permission === 'granted') {
            const notificationTag = 'saveit-success-' + Date.now();
            await self.registration.showNotification('SaveIt', {
              body: 'Content successfully sent to webhook',
              icon: './icons/icon-192.png',
              tag: notificationTag
            });
            
            // Set a timeout to close the notification after 5 seconds
            setTimeout(async () => {
              const notifications = await self.registration.getNotifications({
                tag: notificationTag
              });
              notifications.forEach(notification => notification.close());
            }, 5000);
          } else {
            console.log('No notification permission - cannot show success notification');
          }
        } catch (notificationError) {
          console.error('Failed to show success notification:', notificationError);
        }
        
        // Return a 204 to silently complete the share action
        return new Response(null, { status: 204 });
      } else {
        const errorText = await response.text().catch(e => 'Could not read error details');
        console.error(`Webhook error (SW ${SW_VERSION}):`, response.status, errorText);
        
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
        
        // For client errors (4xx) and server errors (5xx), redirect to main app with error info
        // This ensures the user sees the error message in the UI instead of a blank screen
        let redirectUrl = `./?webhookError=true&errorMessage=${encodeURIComponent(errorMessage)}&errorStatus=${response.status}`;
        
        // Include the webhook response details for debugging
        if (errorText && errorText.length < 200) {
          redirectUrl += `&errorDetails=${encodeURIComponent(errorText)}`;
        }
        
        console.log('Redirecting to main app with error info:', redirectUrl);
        
        // Also try to show a notification as backup
        try {
          if ('Notification' in self && self.Notification.permission === 'granted') {
            await self.registration.showNotification('SaveIt Error', {
              body: errorMessage,
              icon: './icons/icon-192.png',
              requireInteraction: true,
              tag: 'saveit-webhook-error'
            });
          } else {
            console.log('No notification permission - cannot show webhook error notification');
          }
        } catch (notificationError) {
          console.error('Failed to show webhook error notification:', notificationError);
        }
        
        // Redirect to main app to show error in UI
        return Response.redirect(redirectUrl, 303);
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
      
      // For network errors, also redirect to main app with error info
      let redirectUrl = `./?webhookError=true&errorMessage=${encodeURIComponent(errorMessage)}&errorType=network`;
      
      console.log('Redirecting to main app with network error info:', redirectUrl);
      
      // Also try to show a notification as backup
      try {
        if ('Notification' in self && self.Notification.permission === 'granted') {
          await self.registration.showNotification('SaveIt Error', {
            body: errorMessage,
            icon: './icons/icon-192.png',
            requireInteraction: true,
            tag: 'saveit-fetch-error'
          });
        } else {
          console.log('No notification permission - cannot show fetch error notification');
        }
      } catch (notificationError) {
        console.error('Failed to show fetch error notification:', notificationError);
      }
      
      // Redirect to main app to show error in UI
      return Response.redirect(redirectUrl, 303);
    }
  } catch (error) {
    console.error('Error in share handler:', error);
    
    // For general errors, also redirect to main app
    const errorMessage = 'Error processing share. Please try again.';
    let redirectUrl = `./?webhookError=true&errorMessage=${encodeURIComponent(errorMessage)}&errorType=general`;
    
    console.log('Redirecting to main app with general error info:', redirectUrl);
    
    // Also try to show a notification as backup
    try {
      if ('Notification' in self && self.Notification.permission === 'granted') {
        await self.registration.showNotification('SaveIt Error', {
          body: errorMessage,
          icon: './icons/icon-192.png',
          requireInteraction: true,
          tag: 'saveit-general-error'
        });
      } else {
        console.log('No notification permission - cannot show generic error notification');
      }
    } catch (notificationError) {
      console.error('Failed to show generic error notification:', notificationError);
    }
    
    // Redirect to main app to show error in UI
    return Response.redirect(redirectUrl, 303);
  }
}

// Broadcast version information to all clients
async function broadcastVersionToClients() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SW_VERSION',
      version: SW_VERSION,
      cacheName: CACHE_NAME
    });
  });
  console.log(`Broadcasted SW version ${SW_VERSION} to ${clients.length} clients`);
}
