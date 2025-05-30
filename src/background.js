/**
 * SaveIt Chrome Extension - Background Service Worker
 * Handles context menus, toolbar clicks, webhook requests, and notifications
 */

// Import utilities - ES modules are supported in Manifest V3 service workers
import { simpleFetch, getWebhookConfig, logError } from './utils.js';

// Register context menu on extension installation
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'saveit-send',
      title: 'Save It!',
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
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.linkUrl) {
      // For links, try to get the anchor text
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getLinkText,
          args: [info.linkUrl]
        });
        
        const linkText = results[0]?.result || info.linkUrl;
        sendToWebhook(info.linkUrl, linkText);
      } catch (error) {
        // Fallback to URL if script injection fails
        sendToWebhook(info.linkUrl, info.linkUrl);
      }
    } else {
      // For page context, use page title
      sendToWebhook(tab.url, tab.title);
    }
  });
}

/**
 * Content script function to extract link text
 * This function will be injected into the page to find the anchor text
 * @param {string} linkUrl - The URL of the link to find
 * @returns {string} The anchor text or the URL if not found
 */
function getLinkText(linkUrl) {
  // Find all anchor elements
  const links = document.querySelectorAll('a[href]');
  
  for (const link of links) {
    // Check if this link matches the URL we're looking for
    if (link.href === linkUrl) {
      // Return the text content, trimmed and cleaned up
      const text = link.textContent?.trim();
      if (text && text.length > 0) {
        return text;
      }
      
      // If no text content, check for alt text on images
      const img = link.querySelector('img[alt]');
      if (img && img.alt) {
        return img.alt.trim();
      }
      
      // If still no text, check for title attribute
      if (link.title) {
        return link.title.trim();
      }
    }
  }
  
  // If no matching link found, return the URL
  return linkUrl;
}

// Handle messages from popup and notification windows
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendToWebhook') {
      sendToWebhook(request.url, request.title)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Indicate async response
    } else if (request.action === 'showStackTrace') {
      showStackTrace();
      sendResponse({ success: true });
    } else if (request.action === 'retryLastRequest') {
      retryLastRequest();
      sendResponse({ success: true });
    } else if (request.action === 'openOptions') {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
    }
  });
}

/**
 * Show simple stack trace view
 */
async function showStackTrace() {
  try {
    // Get the last error from storage
    const { lastError } = await chrome.storage.local.get(['lastError']);
    
    if (lastError) {
      // Format the error details like curl -v output
      let errorDetails = 'SaveIt Error Log\n\n';
      errorDetails += `Time: ${new Date(lastError.timestamp).toLocaleString()}\n`;
      errorDetails += `URL: ${lastError.url}\n`;
      errorDetails += `Title: ${lastError.title}\n\n`;
      
      // Show request details if available
      if (lastError.requestDetails) {
        errorDetails += `> POST ${lastError.requestDetails.url}\n`;
        if (lastError.requestDetails.headers) {
          Object.entries(lastError.requestDetails.headers).forEach(([key, value]) => {
            errorDetails += `> ${key}: ${value}\n`;
          });
        }
        if (lastError.requestDetails.body) {
          errorDetails += `>\n${lastError.requestDetails.body}\n\n`;
        }
      }
      
      // Show response details if available
      if (lastError.responseDetails) {
        errorDetails += `< HTTP/1.1 ${lastError.responseDetails.status} ${lastError.responseDetails.statusText}\n`;
        
        if (lastError.responseDetails.headers) {
          Object.entries(lastError.responseDetails.headers).forEach(([key, value]) => {
            errorDetails += `< ${key}: ${value}\n`;
          });
        }
        
        if (lastError.responseDetails.responseBody) {
          errorDetails += `<\n${lastError.responseDetails.responseBody}`;
        }
      } else {
        errorDetails += `Error: ${lastError.error}`;
      }
      
      // Create a popup window to show the error details
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>SaveIt Error Log</title>
          <style>
            body { 
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              margin: 20px; 
              background: #1e1e1e;
              color: #d4d4d4;
              font-size: 12px;
              line-height: 1.4;
            }
            .container {
              background: #252526;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #3e3e42;
              max-width: 800px;
            }
            h1 { 
              color: #f14c4c; 
              margin-top: 0;
              font-size: 16px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            pre { 
              background: #1e1e1e; 
              padding: 15px; 
              border-radius: 6px; 
              white-space: pre-wrap; 
              word-wrap: break-word;
              border-left: 3px solid #f14c4c;
              margin: 0;
              overflow-x: auto;
            }
            .close-btn {
              background: #0e639c;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              margin-top: 15px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .close-btn:hover {
              background: #1177bb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>SaveIt Error Log</h1>
            <pre>${errorDetails.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            <button class="close-btn" onclick="window.close()">Close</button>
          </div>
        </body>
        </html>
      `;
      
      // Create a data URL with the HTML content
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
      
      // Open the error log in a new popup window
      await chrome.windows.create({
        url: dataUrl,
        type: 'popup',
        width: 850,
        height: 600,
        focused: true
      });
    } else {
      // Show a simple notification that no error log is available
      sendNotificationToActiveTab({
        type: 'error',
        title: 'SaveIt: No Error Log',
        message: 'No error log available',
        autoClose: true,
        duration: 3000
      });
    }
  } catch (error) {
    console.error('Failed to show error log:', error);
    // Show error notification as fallback
    sendNotificationToActiveTab({
      type: 'error',
      title: 'SaveIt: Error',
      message: 'Failed to retrieve error log',
      autoClose: true,
      duration: 3000
    });
  }
}

/**
 * Retry the last failed request
 */
async function retryLastRequest() {
  try {
    // Get the last error from storage
    const { lastError } = await chrome.storage.local.get(['lastError']);
    
    if (lastError && lastError.url) {
      // Retry the request
      await sendToWebhook(lastError.url, lastError.title || 'Retry Request');
    }
  } catch (error) {
    console.error('Failed to retry from notification:', error);
  }
}

/**
 * Send URL and title to configured webhook
 * @param {string} url - The URL to send
 * @param {string} title - The page title or link text
 */
async function sendToWebhook(url, title) {
  let webhookUrl, options;
  
  try {
    // Get webhook configuration
    const config = await getWebhookConfig();
    webhookUrl = config.webhookUrl;
    const apiKey = config.apiKey;
    
    if (!webhookUrl) {
      // Show configuration error notification (no action buttons)
      sendNotificationToActiveTab({
        type: 'config-error',
        title: 'SaveIt: Setup Required',
        message: 'Please configure your webhook URL in the extension options',
        autoClose: false,
        showConfigButton: true
      });
      return;
    }

    // Prepare payload & options with ISO UTC timestamp
    const payload = { url, title, timestamp: new Date().toISOString() };
    options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    };

    // Add authorization if provided
    if (apiKey) options.headers['Authorization'] = `Bearer ${apiKey}`;

    // Send request (single attempt)
    await simpleFetch(webhookUrl, options);
    showNotification(true, title);

  } catch (error) {
    // Log error with details including request information
    await logError({
      url, 
      title, 
      error: error.message,
      timestamp: new Date().toISOString(),
      requestDetails: {
        url: webhookUrl,
        headers: options?.headers || {},
        body: options?.body || ''
      },
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
  sendNotificationToActiveTab({
    type: 'success',
    title: 'SaveIt: Sent!',
    message: title,
    autoClose: true,
    duration: 3000
  });
}

/**
 * Show error notification with action buttons
 * @param {string} error - Error message
 * @param {string} url - Failed URL
 */
function showErrorNotification(error, url) {
  sendNotificationToActiveTab({
    type: 'error',
    title: 'SaveIt: Failed',
    message: `Failed to send: ${url}`,
    autoClose: false
  });
}

/**
 * Send notification to active tab's content script
 * @param {Object} data - Notification data
 */
async function sendNotificationToActiveTab(data) {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.id) {
      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        data: data
      });
    }
  } catch (error) {
    console.error('Failed to send notification to content script:', error);
    console.error('This usually means the content script is not loaded on this page.');
    console.error('Try refreshing the page or testing on a different website.');
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
  showNotification,
  showStackTrace,
  retryLastRequest,
  sendNotificationToActiveTab
};