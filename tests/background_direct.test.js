/**
 * Simplified tests for background.js to improve coverage
 * 
 * This file tests background.js with simplified mocking
 * to avoid complex module loading issues while maintaining good coverage.
 */

// Import Vitest globals
import { describe, test, expect, vi } from 'vitest';

// Import the actual functions from background.js
import {
  showStackTrace,
  retryLastRequest,
  sendNotificationToActiveTab,
  sendToWebhook,
  showSuccessNotification,
  showErrorNotification,
  showNotification
} from '../src/background.js';

// Test the ES module exports
describe('Background Service Worker ES Module Exports', () => {
  test('should export required functions as ES modules', () => {
    expect(typeof sendToWebhook).toBe('function');
    expect(typeof showSuccessNotification).toBe('function');
    expect(typeof showErrorNotification).toBe('function');
    expect(typeof showNotification).toBe('function');
    expect(typeof showStackTrace).toBe('function');
  });
});

// Test showStackTrace function
describe('showStackTrace', () => {
  test('should show error details when lastError exists', async () => {
    // Mock chrome.windows.create
    global.chrome.windows.create = vi.fn().mockResolvedValue({ id: 1 });
    
    // Mock chrome.storage.local.get to return error data
    global.chrome.storage.local.get.mockResolvedValue({
      lastError: {
        timestamp: '2023-01-01T12:00:00.000Z',
        url: 'https://example.com',
        title: 'Test Page',
        error: 'Network error',
        responseDetails: {
          status: 500,
          statusText: 'Internal Server Error',
          responseBody: 'Server error occurred'
        }
      }
    });
    
    await showStackTrace();
    
    expect(global.chrome.windows.create).toHaveBeenCalledWith({
      url: expect.stringContaining('data:text/html'),
      type: 'popup',
      width: 850,
      height: 600,
      focused: true
    });
    
    // Verify the HTML content contains the expected error details
    const dataUrl = global.chrome.windows.create.mock.calls[0][0].url;
    const htmlContent = decodeURIComponent(dataUrl.replace('data:text/html;charset=utf-8,', ''));
    expect(htmlContent).toContain('1/1/2023');
    expect(htmlContent).toContain('https://example.com');
    expect(htmlContent).toContain('500 Internal Server Error');
    expect(htmlContent).toContain('Server error occurred');
  });

  test('should show generic error when no response details available', async () => {
    // Mock chrome.windows.create
    global.chrome.windows.create = vi.fn().mockResolvedValue({ id: 1 });
    
    // Mock chrome.storage.local.get to return error data without response details
    global.chrome.storage.local.get.mockResolvedValue({
      lastError: {
        timestamp: '2023-01-01T12:00:00.000Z',
        url: 'https://example.com',
        title: 'Test Page',
        error: 'Network error'
      }
    });
    
    await showStackTrace();
    
    // Verify the HTML content contains the generic error message
    const dataUrl = global.chrome.windows.create.mock.calls[0][0].url;
    const htmlContent = decodeURIComponent(dataUrl.replace('data:text/html;charset=utf-8,', ''));
    expect(htmlContent).toContain('Network error');
  });

  test('should show notification when no error log is available', async () => {
    // Mock chrome.storage.local.get to return no error data
    global.chrome.storage.local.get.mockResolvedValue({});
    
    // Mock sendNotificationToActiveTab
    global.chrome.tabs.sendMessage = vi.fn().mockResolvedValue();
    global.chrome.tabs.query = vi.fn().mockResolvedValue([{ id: 1 }]);
    
    await showStackTrace();
    
    // Verify a notification is sent when no error log exists
    expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      action: 'showNotification',
      data: {
        type: 'error',
        title: 'SaveIt: No Error Log',
        message: 'No error log available',
        autoClose: true,
        duration: 3000
      }
    });
  });
});

// Test retryLastRequest function
describe('retryLastRequest', () => {
  test('should retry the last failed request', async () => {
    // Mock storage to return a last error
    chrome.storage.local.get.mockResolvedValueOnce({
      lastError: {
        url: 'https://example.com/test-retry',
        title: 'Test Retry Page'
      }
    });
    
    // Mock tabs and messaging for sendToWebhook
    chrome.tabs.query.mockResolvedValue([{ id: 1 }]);
    chrome.storage.sync.get.mockResolvedValue({ webhookUrl: 'https://webhook.example.com' });
    
    // Call the function
    await retryLastRequest();
    
    // Verify storage was queried for the last error
    expect(chrome.storage.local.get).toHaveBeenCalledWith(['lastError']);
    
    // Verify that we attempted to send to webhook with the stored URL and title
    expect(chrome.storage.sync.get).toHaveBeenCalledWith(['webhookUrl', 'apiKey']);
    expect(chrome.tabs.sendMessage).toHaveBeenCalled();
  });
  
  test('should do nothing when no previous error exists', async () => {
    // Mock storage to return no last error
    chrome.storage.local.get.mockResolvedValueOnce({});
    
    // Call the function
    await retryLastRequest();
    
    // Verify storage was queried
    expect(chrome.storage.local.get).toHaveBeenCalledWith(['lastError']);
    
    // Verify we didn't try to call sendToWebhook (no calls to get webhook config)
    expect(chrome.storage.sync.get).not.toHaveBeenCalled();
  });
});

// Test sendNotificationToActiveTab function
describe('sendNotificationToActiveTab', () => {
  test('should send notification to active tab', async () => {
    // Mock tabs API
    chrome.tabs.query.mockResolvedValueOnce([{ id: 123, active: true }]);
    chrome.tabs.sendMessage.mockResolvedValueOnce({});
    
    // Notification data
    const notificationData = {
      type: 'success',
      title: 'Test Notification',
      message: 'Test message',
      autoClose: true
    };
    
    // Call the function
    await sendNotificationToActiveTab(notificationData);
    
    // Verify tabs were queried correctly
    expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    
    // Verify message was sent correctly
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
      action: 'showNotification',
      data: notificationData
    });
  });
  
  test('should handle missing tab gracefully', async () => {
    // Mock tabs API to return no tabs
    chrome.tabs.query.mockResolvedValueOnce([]);
    
    // Notification data
    const notificationData = {
      type: 'error',
      title: 'Test Error',
      message: 'Error message'
    };
    
    // Call the function
    await sendNotificationToActiveTab(notificationData);
    
    // Verify tabs were queried
    expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    
    // Verify no message was sent (since there's no tab)
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });
});

// Test sendToWebhook function
describe('sendToWebhook', () => {
  test('should show configuration error when no webhook URL is configured', async () => {
    // Mock chrome.tabs.sendMessage and query
    global.chrome.tabs.sendMessage = vi.fn().mockResolvedValue();
    global.chrome.tabs.query = vi.fn().mockResolvedValue([{ id: 1 }]);
    
    // Mock chrome.storage.sync.get to return no webhook URL
    global.chrome.storage.sync.get = vi.fn().mockResolvedValue({});
    
    await sendToWebhook('https://example.com', 'Test Page');
    
    expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      action: 'showNotification',
      data: {
        type: 'config-error',
        title: 'SaveIt: Setup Required',
        message: 'Please configure your webhook URL in the extension options',
        autoClose: false,
        showConfigButton: true
      }
    });
  });
});