/**
 * Shared utilities for SaveIt Chrome Extension
 * These are defined globally so they can be accessed by other scripts
 * @fileoverview
 */

// Self-executing function to avoid polluting the global namespace
(function(global) {
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

  // Export utility functions to the global scope
  // This is the best approach for Chrome extensions that don't use module bundlers
  global.fetchWithRetry = fetchWithRetry;
  global.getWebhookConfig = getWebhookConfig;
  global.saveWebhookConfig = saveWebhookConfig;
  global.logError = logError;
  global.getLastError = getLastError;

})(typeof self !== 'undefined' ? self : this);