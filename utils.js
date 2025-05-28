/**
 * Shared utilities for SaveIt Chrome Extension
 */

/**
 * Fetch with retry logic for robust webhook requests
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} delay - Delay between retries in ms (default: 3000)
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithRetry(url, options, retries = 3, delay = 3000) {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        // Capture response details for error logging
        const responseText = await response.text().catch(() => 'Unable to read response');
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          responseBody: responseText,
          attempt: attempt
        };
        
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.responseDetails = errorDetails;
        throw error;
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // If this is not the last attempt, wait before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Get webhook configuration from storage
 * @returns {Promise<{webhookUrl: string, apiKey: string}>} Configuration object
 */
async function getWebhookConfig() {
  const { webhookUrl, apiKey } = await chrome.storage.sync.get(['webhookUrl', 'apiKey']);
  return { webhookUrl, apiKey };
}

/**
 * Save webhook configuration to storage
 * @param {string} webhookUrl - The webhook URL
 * @param {string} apiKey - The API key/Bearer token
 */
async function saveWebhookConfig(webhookUrl, apiKey) {
  await chrome.storage.sync.set({ webhookUrl, apiKey });
}

/**
 * Log error details for debugging
 * @param {object} errorDetails - Error details object
 */
async function logError(errorDetails) {
  await chrome.storage.local.set({ 
    lastError: { 
      ...errorDetails, 
      timestamp: Date.now() 
    } 
  });
}

/**
 * Get last error from storage
 * @returns {Promise<object>} Last error object
 */
async function getLastError() {
  const { lastError } = await chrome.storage.local.get(['lastError']);
  return lastError;
}

// Export for testing
export {
  fetchWithRetry,
  getWebhookConfig,
  saveWebhookConfig,
  logError,
  getLastError
};

// Export functions to global scope for Chrome extension context
// This is needed because Chrome extensions can't use ES modules directly
if (typeof window !== 'undefined') {
  window.fetchWithRetry = fetchWithRetry;
  window.getWebhookConfig = getWebhookConfig;
  window.saveWebhookConfig = saveWebhookConfig;
  window.logError = logError;
  window.getLastError = getLastError;
} else if (typeof self !== 'undefined') {
  self.fetchWithRetry = fetchWithRetry;
  self.getWebhookConfig = getWebhookConfig;
  self.saveWebhookConfig = saveWebhookConfig;
  self.logError = logError;
  self.getLastError = getLastError;
}