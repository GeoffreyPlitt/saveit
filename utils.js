/**
 * Shared utilities for SaveIt Chrome Extension
 */

// Self-executing function to avoid polluting the global namespace
(function(global) {
  /**
   * Fetch with retry logic
   * @param {string} url - URL to fetch
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
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          
          error.responseDetails = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            responseBody: responseText,
            attempt
          };
          
          throw error;
        }
        
        return response;
      } catch (error) {
        lastError = error;
        
        // If not the last attempt, wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError; // All retries exhausted
  }

  /**
   * Storage utility functions
   */
  const storage = {
    // Get webhook configuration
    getConfig: async () => {
      const { webhookUrl, apiKey } = await chrome.storage.sync.get(['webhookUrl', 'apiKey']);
      return { webhookUrl, apiKey };
    },
    
    // Save webhook configuration
    saveConfig: async (webhookUrl, apiKey) => 
      chrome.storage.sync.set({ webhookUrl, apiKey }),
    
    // Log error details
    logError: async (errorDetails) => 
      chrome.storage.local.set({ 
        lastError: { ...errorDetails, timestamp: Date.now() } 
      }),
    
    // Get last error
    getError: async () => {
      const { lastError } = await chrome.storage.local.get(['lastError']);
      return lastError;
    }
  };

  // Export utility functions to the global scope
  global.fetchWithRetry = fetchWithRetry;
  global.getWebhookConfig = storage.getConfig;
  global.saveWebhookConfig = storage.saveConfig;
  global.logError = storage.logError;
  global.getLastError = storage.getError;
})(typeof self !== 'undefined' ? self : this);