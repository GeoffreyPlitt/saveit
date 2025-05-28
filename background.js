/**
 * SaveIt Chrome Extension - Background Service Worker
 * Handles context menus, toolbar clicks, webhook requests, and notifications
 */

// Register context menu on extension installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveit-send',
    title: 'Send to Webhook',
    contexts: ['link', 'page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || tab.url;
  const title = tab.title;
  await sendToWebhook(url, title);
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendToWebhook') {
    sendToWebhook(request.url, request.title)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    // Return true to indicate async response
    return true;
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId.startsWith('saveit-error') && buttonIndex === 0) {
    // Open error details page
    chrome.tabs.create({
      url: chrome.runtime.getURL('error/error.html')
    });
  }
});

/**
 * Send URL and title to configured webhook
 * @param {string} url - The URL to send
 * @param {string} title - The page title
 */
async function sendToWebhook(url, title) {
  try {
    // Get webhook configuration
    const { webhookUrl, apiKey } = await chrome.storage.sync.get(['webhookUrl', 'apiKey']);
    
    if (!webhookUrl) {
      showErrorNotification('No webhook URL configured', url);
      return;
    }

    // Prepare payload
    const payload = {
      url: url,
      title: title,
      timestamp: Date.now()
    };

    // Prepare request options
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    };

    // Add authorization header if API key is provided
    if (apiKey) {
      options.headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Send request with retry logic
    const response = await fetchWithRetry(webhookUrl, options);
    
    // Show success notification
    showSuccessNotification(title);

  } catch (error) {
    // Log error details
    await chrome.storage.local.set({
      lastError: {
        url: url,
        title: title,
        error: error.message,
        timestamp: Date.now()
      }
    });

    // Show error notification
    showErrorNotification(error.message, url);
  }
}

/**
 * Show success notification
 * @param {string} title - Page title
 */
function showSuccessNotification(title) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-16.png',
    title: 'SaveIt: Sent!',
    message: title
  });
}

/**
 * Show error notification with action button
 * @param {string} error - Error message
 * @param {string} url - Failed URL
 */
function showErrorNotification(error, url) {
  const notificationId = `saveit-error-${Date.now()}`;
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon-16.png',
    title: 'SaveIt: Failed',
    message: `Failed to send: ${url}`,
    buttons: [{ title: 'View Error' }]
  });
}

/**
 * Fetch with retry logic - imported from utils.js concept
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} delay - Delay between retries in ms (default: 3000)
 */
async function fetchWithRetry(url, options, retries = 3, delay = 3000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  } catch (error) {
    if (retries > 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay);
    }
    throw error;
  }
}