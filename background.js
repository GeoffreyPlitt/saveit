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
  chrome.action.onClicked.addListener(tab => sendToWebhook(tab.url, tab.title));
}

// Handle context menu clicks
if (typeof chrome !== 'undefined' && chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    sendToWebhook(info.linkUrl || tab.url, tab.title);
  });
}

// Handle messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendToWebhook') {
      sendToWebhook(request.url, request.title)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Indicate async response
    }
  });
}

// Handle notification button clicks
if (typeof chrome !== 'undefined' && chrome.notifications && chrome.notifications.onButtonClicked) {
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId.startsWith('saveit-error') && buttonIndex === 0) {
      chrome.tabs.create({ url: chrome.runtime.getURL('error/error.html') });
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
    // Get webhook configuration
    const { webhookUrl, apiKey } = await getWebhookConfig();
    
    if (!webhookUrl) {
      showNotification(false, 'No webhook URL configured', url);
      return;
    }

    // Prepare payload & options
    const payload = { url, title, timestamp: Date.now() };
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    };

    // Add authorization if provided
    if (apiKey) options.headers['Authorization'] = `Bearer ${apiKey}`;

    // Send request with retry logic
    await fetchWithRetry(webhookUrl, options);
    showNotification(true, title);

  } catch (error) {
    // Log error with details
    await logError({
      url, title, error: error.message,
      timestamp: Date.now(),
      ...(error.responseDetails && { responseDetails: error.responseDetails })
    });

    showNotification(false, error.message, url);
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

/**
 * Show notification - unified version
 * @param {boolean} success - Whether operation was successful
 * @param {string} message - Message to show
 * @param {string} [url] - URL for error messages
 */
function showNotification(success, message, url) {
  if (success) {
    showSuccessNotification(message);
  } else {
    showErrorNotification(message, url);
  }
}

// Export functions for testing
export {
  sendToWebhook,
  showSuccessNotification,
  showErrorNotification,
  showNotification
};

// Export functions to global scope for Chrome extension context
if (typeof window !== 'undefined') {
  window.sendToWebhook = sendToWebhook;
  window.showSuccessNotification = showSuccessNotification;
  window.showErrorNotification = showErrorNotification;
  window.showNotification = showNotification;
} else if (typeof self !== 'undefined') {
  self.sendToWebhook = sendToWebhook;
  self.showSuccessNotification = showSuccessNotification;
  self.showErrorNotification = showErrorNotification;
  self.showNotification = showNotification;
}