/**
 * Tests for background.js functionality
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.org/"}
 */

// Import Jest globals
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Create real mock functions
const mockFetchWithRetry = jest.fn(() => Promise.resolve({}));
const mockGetWebhookConfig = jest.fn(() => Promise.resolve({
  webhookUrl: 'https://example.com/webhook',
  apiKey: 'test-api-key'
}));
const mockLogError = jest.fn(() => Promise.resolve());
const mockGetLastError = jest.fn(() => Promise.resolve(null));

// Mock the entire utils module
jest.mock('../utils.js', () => {
  return {
    __esModule: true,
    fetchWithRetry: mockFetchWithRetry,
    getWebhookConfig: mockGetWebhookConfig,
    logError: mockLogError,
    getLastError: mockGetLastError
  };
});

// Import functions from background.js for testing
import { 
  sendToWebhook, 
  showSuccessNotification, 
  showErrorNotification 
} from '../background.js';

describe('Background Service Worker', () => {
  // Test variables
  const testUrl = 'https://example.com';
  const testTitle = 'Example Page';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('sendToWebhook function', () => {
    test('should send a webhook request with correct payload', async () => {
      // Mock getWebhookConfig to return webhook URL and API key
      mockGetWebhookConfig.mockResolvedValueOnce({
        webhookUrl: 'https://example.com/webhook',
        apiKey: 'test-api-key'
      });
      
      // Mock fetchWithRetry to return success
      mockFetchWithRetry.mockResolvedValueOnce({});
      
      // Call the function
      await sendToWebhook(testUrl, testTitle);
      
      // Verify fetchWithRetry was called with correct URL
      expect(mockFetchWithRetry).toHaveBeenCalledTimes(1);
      expect(mockFetchWithRetry.mock.calls[0][0]).toBe('https://example.com/webhook');
      
      // Check request options
      const options = mockFetchWithRetry.mock.calls[0][1];
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['Authorization']).toBe('Bearer test-api-key');
      
      // Verify payload
      const payload = JSON.parse(options.body);
      expect(payload.url).toBe(testUrl);
      expect(payload.title).toBe(testTitle);
      expect(payload.timestamp).toBeDefined();
      
      // Verify success notification was shown
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
    });
    
    test('should handle missing webhook URL', async () => {
      // Mock getWebhookConfig to return empty webhook URL
      mockGetWebhookConfig.mockResolvedValueOnce({
        webhookUrl: '',
        apiKey: 'test-api-key'
      });
      
      // Call the function
      await sendToWebhook(testUrl, testTitle);
      
      // Verify fetchWithRetry was not called
      expect(mockFetchWithRetry).not.toHaveBeenCalled();
      
      // Verify error notification was shown
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
    });
    
    test('should handle fetch errors', async () => {
      // Mock getWebhookConfig to return webhook URL and API key
      mockGetWebhookConfig.mockResolvedValueOnce({
        webhookUrl: 'https://example.com/webhook',
        apiKey: 'test-api-key'
      });
      
      // Mock fetchWithRetry to throw an error
      const testError = new Error('Network error');
      mockFetchWithRetry.mockRejectedValueOnce(testError);
      
      // Call the function
      await sendToWebhook(testUrl, testTitle);
      
      // Verify error was logged
      expect(mockLogError).toHaveBeenCalledTimes(1);
      const errorLog = mockLogError.mock.calls[0][0];
      expect(errorLog.url).toBe(testUrl);
      expect(errorLog.title).toBe(testTitle);
      expect(errorLog.error).toBe('Network error');
      expect(errorLog.timestamp).toBeDefined();
      
      // Verify error notification was shown
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
    });
    
    test('should handle non-OK response', async () => {
      // Mock getWebhookConfig to return webhook URL and API key
      mockGetWebhookConfig.mockResolvedValueOnce({
        webhookUrl: 'https://example.com/webhook',
        apiKey: 'test-api-key'
      });
      
      // Create error with response details
      const error = new Error('HTTP error: 401');
      error.responseDetails = {
        status: 401,
        statusText: 'Unauthorized',
        responseBody: '{"error":"Unauthorized"}'
      };
      
      // Mock fetchWithRetry to throw the error
      mockFetchWithRetry.mockRejectedValueOnce(error);
      
      // Call the function
      await sendToWebhook(testUrl, testTitle);
      
      // Verify error was logged
      expect(mockLogError).toHaveBeenCalledTimes(1);
      
      // Verify error notification was shown
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
  });
});