/**
 * Shared utilities for SaveIt Chrome Extension
 */

/**
 * Simple fetch function for webhook requests
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function simpleFetch(url, options) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    // Capture response details for error logging
    const responseText = await response.text().catch(() => 'Unable to read response');
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    
    error.responseDetails = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      responseBody: responseText
    };
    
    throw error;
  }
  
  return response;
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
      timestamp: new Date().toISOString() 
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
  simpleFetch,
  getWebhookConfig,
  saveWebhookConfig,
  logError,
  getLastError
};
