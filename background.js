/**
 * SaveIt Chrome Extension - Background Service Worker
 * Handles context menus, toolbar clicks, webhook requests, and notifications
 */

// Import utilities
importScripts('utils.js');

// Register context menu on extension installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveit-send',
    title: 'Send to Webhook',
    contexts: ['link', 'page']
  });
});

// Handle toolbar icon clicks (chrome.action.onClicked)
chrome.action.onClicked.addListener(tab => sendToWebhook(tab.url, tab.title));

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  sendToWebhook(info.linkUrl || tab.url, tab.title);
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendToWebhook') {
    sendToWebhook(request.url, request.title)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicate async response
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith('saveit-error') && buttonIndex === 0) {
    chrome.tabs.create({ url: chrome.runtime.getURL('error/error.html') });
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
 * Show notification
 * @param {boolean} success - Whether operation was successful
 * @param {string} message - Message to show
 * @param {string} [url] - URL for error messages
 */
function showNotification(success, message, url) {
  const options = {
    type: 'basic',
    iconUrl: 'icons/icon-16.png',
    title: `SaveIt: ${success ? 'Sent!' : 'Failed'}`,
    message: success ? message : `Failed to send: ${url || message}`
  };
  
  if (!success) {
    options.buttons = [{ title: 'View Error' }];
    chrome.notifications.create(`saveit-error-${Date.now()}`, options);
  } else {
    chrome.notifications.create(options);
  }
}