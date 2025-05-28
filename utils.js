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