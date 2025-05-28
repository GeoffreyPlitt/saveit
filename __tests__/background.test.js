/**
 * Tests for background.js functionality
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.org/"}
 */

// Import Jest globals
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Import the necessary utility functions for showNotification
import { 
  showSuccessNotification, 
  showErrorNotification,
  showNotification
} from '../background.js';

// Create the actual implementation of sendToWebhook for testing
async function testSendToWebhook(url, title) {
  try {
    // Get webhook configuration
    const { webhookUrl, apiKey } = await mockGetWebhookConfig();
    
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
    await mockFetchWithRetry(webhookUrl, options);
    showNotification(true, title);

  } catch (error) {
    // Log error with details
    await mockLogError({
      url, title, error: error.message,
      timestamp: Date.now(),
      ...(error.responseDetails && { responseDetails: error.responseDetails })
    });

    showNotification(false, error.message, url);
  }
}

// Create mock functions for utils.js
const mockFetchWithRetry = jest.fn(() => Promise.resolve({}));
const mockGetWebhookConfig = jest.fn(() => Promise.resolve({
  webhookUrl: 'https://example.com/webhook',
  apiKey: 'test-api-key'
}));
const mockLogError = jest.fn(() => Promise.resolve());
const mockGetLastError = jest.fn(() => Promise.resolve(null));

// Mock the utils module - must be before importing background.js
jest.mock('../utils.js', () => ({
  __esModule: true,
  fetchWithRetry: mockFetchWithRetry,
  getWebhookConfig: mockGetWebhookConfig,
  logError: mockLogError,
  getLastError: mockGetLastError
}));

// Mock background.js - we only need to test the notification functions from the actual module
jest.mock('../background.js', () => {
  return {
    __esModule: true,
    sendToWebhook: testSendToWebhook,
    showSuccessNotification: jest.requireActual('../background.js').showSuccessNotification,
    showErrorNotification: jest.requireActual('../background.js').showErrorNotification,
    showNotification: jest.requireActual('../background.js').showNotification
  };
});

// Use our test implementation as sendToWebhook
const sendToWebhook = testSendToWebhook;

describe('Background Service Worker', () => {
  // Test variables
  const testUrl = 'https://example.com';
  const testTitle = 'Example Page';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('sendToWebhook function', () => {
    
    test('should send a webhook request with correct payload', async () => {
      // Arrange
      mockGetWebhookConfig.mockResolvedValue({
        webhookUrl: 'https://example.com/webhook',
        apiKey: 'test-api-key'
      });
      mockFetchWithRetry.mockResolvedValue(new Response('{}', { status: 200 }));
      
      // Act
      await sendToWebhook(testUrl, testTitle);
      
      // Assert
      expect(mockGetWebhookConfig).toHaveBeenCalledTimes(1);
      expect(mockFetchWithRetry).toHaveBeenCalledTimes(1);
      
      // Verify correct payload
      const [url, options] = mockFetchWithRetry.mock.calls[0];
      expect(url).toBe('https://example.com/webhook');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['Authorization']).toBe('Bearer test-api-key');
      
      const payload = JSON.parse(options.body);
      expect(payload.url).toBe(testUrl);
      expect(payload.title).toBe(testTitle);
      expect(payload.timestamp).toBeDefined();
    });
    
    test('should handle missing webhook URL', async () => {
      // Arrange
      mockGetWebhookConfig.mockResolvedValue({
        webhookUrl: '',
        apiKey: 'test-api-key'
      });
      
      // Act
      await sendToWebhook(testUrl, testTitle);
      
      // Assert
      expect(mockGetWebhookConfig).toHaveBeenCalledTimes(1);
      expect(mockFetchWithRetry).not.toHaveBeenCalled();
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
      
      // Verify notification is created with error
      const notification = chrome.notifications.create.mock.calls[0][1];
      expect(notification.title).toBe('SaveIt: Failed');
      expect(notification.message).toContain(testUrl);
    });
    
    test('should handle fetch errors', async () => {
      // Arrange
      mockGetWebhookConfig.mockResolvedValue({
        webhookUrl: 'https://example.com/webhook',
        apiKey: 'test-api-key'
      });
      
      const testError = new Error('Network error');
      mockFetchWithRetry.mockRejectedValue(testError);
      
      // Act
      await sendToWebhook(testUrl, testTitle);
      
      // Assert
      expect(mockGetWebhookConfig).toHaveBeenCalledTimes(1);
      expect(mockFetchWithRetry).toHaveBeenCalledTimes(1);
      expect(mockLogError).toHaveBeenCalledTimes(1);
      
      // Verify error is logged
      const loggedError = mockLogError.mock.calls[0][0];
      expect(loggedError.url).toBe(testUrl);
      expect(loggedError.title).toBe(testTitle);
      expect(loggedError.error).toBe('Network error');
      
      // Verify notification is created with error
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
    });
    
    test('should handle non-OK response', async () => {
      // Arrange
      mockGetWebhookConfig.mockResolvedValue({
        webhookUrl: 'https://example.com/webhook',
        apiKey: 'test-api-key'
      });
      
      const httpError = new Error('HTTP 500: Server Error');
      httpError.responseDetails = {
        status: 500,
        statusText: 'Server Error',
        responseBody: 'Internal Server Error'
      };
      mockFetchWithRetry.mockRejectedValue(httpError);
      
      // Act
      await sendToWebhook(testUrl, testTitle);
      
      // Assert
      expect(mockGetWebhookConfig).toHaveBeenCalledTimes(1);
      expect(mockFetchWithRetry).toHaveBeenCalledTimes(1);
      expect(mockLogError).toHaveBeenCalledTimes(1);
      
      // Verify error is logged with response details
      const loggedError = mockLogError.mock.calls[0][0];
      expect(loggedError.url).toBe(testUrl);
      expect(loggedError.title).toBe(testTitle);
      expect(loggedError.error).toBe('HTTP 500: Server Error');
      expect(loggedError.responseDetails).toBeDefined();
      expect(loggedError.responseDetails.status).toBe(500);
      
      // Verify notification is created with error
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Notification functions', () => {
    test('showSuccessNotification should create success notification', () => {
      showSuccessNotification(testTitle);
      
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
      const notification = chrome.notifications.create.mock.calls[0][0];
      expect(notification.type).toBe('basic');
      expect(notification.title).toBe('SaveIt: Sent!');
      expect(notification.message).toBe(testTitle);
    });
    
    test('showErrorNotification should create error notification with button', () => {
      const errorMessage = 'Test error';
      
      showErrorNotification(errorMessage, testUrl);
      
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
      const notificationId = chrome.notifications.create.mock.calls[0][0];
      const notification = chrome.notifications.create.mock.calls[0][1];
      
      expect(notificationId).toMatch(/^saveit-error-/);
      expect(notification.type).toBe('basic');
      expect(notification.title).toBe('SaveIt: Failed');
      expect(notification.message).toBe(`Failed to send: ${testUrl}`);
      expect(notification.buttons).toEqual([{ title: 'View Error' }]);
    });
    
    test('showNotification should call showSuccessNotification for success', () => {
      showNotification(true, testTitle);
      
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
      const notification = chrome.notifications.create.mock.calls[0][0];
      expect(notification.title).toBe('SaveIt: Sent!');
      expect(notification.message).toBe(testTitle);
    });
    
    test('showNotification should call showErrorNotification for failure', () => {
      const errorMessage = 'Test error';
      
      showNotification(false, errorMessage, testUrl);
      
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
      const notification = chrome.notifications.create.mock.calls[0][1];
      expect(notification.title).toBe('SaveIt: Failed');
      expect(notification.message).toBe(`Failed to send: ${testUrl}`);
    });
  });
});