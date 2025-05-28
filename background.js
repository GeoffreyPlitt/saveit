/**
 * SaveIt Chrome Extension - Background Service Worker
 * Handles context menus, toolbar clicks, webhook requests, and notifications
 */

// Import utilities
// For ES modules in testing context
import { fetchWithRetry, getWebhookConfig, logError } from './utils.js';

// For traditional Chrome extension context (fallback)
try {
  if (typeof importScripts === 'function') {
    importScripts('utils.js');
  }
} catch (e) {
  console.error('Error importing utils.js', e);
}

// Register context menu on extension installation
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'saveit-send',
      title: 'Send to Webhook',
      contexts: ['link', 'page']
    });
  });
}

// Handle toolbar icon clicks (chrome.action.onClicked)
if (typeof chrome !== 'undefined' && chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async (tab) => {
    await sendToWebhook(tab.url, tab.title);
  });
}

// Handle context menu clicks
if (typeof chrome !== 'undefined' && chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const url = info.linkUrl || tab.url;
    const title = tab.title;
    await sendToWebhook(url, title);
  });
}

// Handle messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendToWebhook') {
      sendToWebhook(request.url, request.title)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      
      // Return true to indicate async response
      return true;
    }
  });
}

// Handle notification button clicks
if (typeof chrome !== 'undefined' && chrome.notifications && chrome.notifications.onButtonClicked) {
  chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    if (notificationId.startsWith('saveit-error') && buttonIndex === 0) {
      // Open error details page
      chrome.tabs.create({
        url: chrome.runtime.getURL('error/error.html')
      });
    }
  });
}

/**
 * Send URL and title to configured webhook
 * @param {string} url - The URL to send
 * @param {string} title - The page title
 */
async function sendToWebhook(url, title) {
  try {
    // Get webhook configuration using utils
    const { webhookUrl, apiKey } = await getWebhookConfig();
    
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
    await fetchWithRetry(webhookUrl, options);
    
    // Show success notification
    showSuccessNotification(title);

  } catch (error) {
    // Enhanced error logging with response details
    const errorData = {
      url: url,
      title: title,
      error: error.message,
      timestamp: Date.now()
    };

    // Include response details if available
    if (error.responseDetails) {
      errorData.responseDetails = error.responseDetails;
    }

    // Log error using utils
    await logError(errorData);

    // Show error notification
    showErrorNotification(error.message, url);
  }
}

/**
 * Show success notification
 * @param {string} title - Page title
 */
function showSuccessNotification(title) {
  if (typeof chrome !== 'undefined' && chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-16.png',
      title: 'SaveIt: Sent!',
      message: title
    });
  }
}

/**
 * Show error notification with action button
 * @param {string} error - Error message
 * @param {string} url - Failed URL
 */
function showErrorNotification(error, url) {
  if (typeof chrome !== 'undefined' && chrome.notifications) {
    const notificationId = `saveit-error-${Date.now()}`;
    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon-16.png',
      title: 'SaveIt: Failed',
      message: `Failed to send: ${url}`,
      buttons: [{ title: 'View Error' }]
    });
  }
}

// Export functions for testing
export {
  sendToWebhook,
  showSuccessNotification,
  showErrorNotification
};

// Export functions to global scope for Chrome extension context
if (typeof window !== 'undefined') {
  window.sendToWebhook = sendToWebhook;
  window.showSuccessNotification = showSuccessNotification;
  window.showErrorNotification = showErrorNotification;
} else if (typeof self !== 'undefined') {
  self.sendToWebhook = sendToWebhook;
  self.showSuccessNotification = showSuccessNotification;
  self.showErrorNotification = showErrorNotification;
}