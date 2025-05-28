/**
 * Simple test script to check if modules are properly imported
 */

// Import utils
import { fetchWithRetry, getWebhookConfig } from '../utils.js';
console.log('Utils imported successfully:', typeof fetchWithRetry, typeof getWebhookConfig);

// Import background
import { sendToWebhook, showSuccessNotification } from '../background.js';
console.log('Background imported successfully:', typeof sendToWebhook, typeof showSuccessNotification);

// We'll validate our approach by seeing if these modules can be imported correctly
console.log('Test successful!');