/**
 * Tests for background.js functionality
 * This test file simulates the Chrome extension environment for background script testing
 * 
 * @jest-environment jsdom
 */

// Import Vitest globals
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock the utils module - must be before importing background.js
vi.mock('../src/utils.js', () => {
  // Use the real utils.js module
  const originalModule = vi.importActual('../src/utils.js');
  return {
    ...originalModule,
    getWebhookConfig: vi.fn(),
    simpleFetch: vi.fn(),
    logError: vi.fn()
  };
});

// Import the actual background.js code - this must be after mocking utils.js
import * as background from '../src/background.js';

describe('Background Service Worker', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset chrome mocks
    global.chrome.tabs.query.mockClear();
    global.chrome.tabs.sendMessage.mockClear();
    global.chrome.storage.sync.get.mockClear();
    global.chrome.storage.local.set.mockClear();
  });

  beforeEach(() => {
    // Mock storage.sync.get to return our test values
    chrome.storage.sync.get.mockImplementation((keys) => {
      // This will be called by getWebhookConfig in background.js
      if (Array.isArray(keys) && keys.includes('webhookUrl') && keys.includes('apiKey')) {
        return Promise.resolve({
          webhookUrl: 'https://example.com/webhook',
          apiKey: 'test-api-key'
        });
      }
      return Promise.resolve({});
    });

    // Make simpleFetch available to global scope for the background.js to use
    global.simpleFetch = vi.fn().mockResolvedValue({ ok: true });
  });

  // Test variables
  const testUrl = 'https://example.com';
  const testTitle = 'Example Page';
  
  describe('Notification functions', () => {
    beforeEach(() => {
      // Mock active tab query for notification functions
      chrome.tabs.query.mockResolvedValue([{ id: 1, url: testUrl, title: testTitle }]);
    });

    test('showSuccessNotification should send message to content script', async () => {
      await background.showSuccessNotification(testTitle);
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
      const message = chrome.tabs.sendMessage.mock.calls[0][1];
      expect(message.action).toBe('showNotification');
      expect(message.data.type).toBe('success');
      expect(message.data.title).toBe('SaveIt: Sent!');
      expect(message.data.message).toBe(testTitle);
      expect(message.data.autoClose).toBe(true);
    });
    
    test('showErrorNotification should send error message to content script', async () => {
      const errorMessage = 'Test error';
      
      await background.showErrorNotification(errorMessage, testUrl);
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
      const message = chrome.tabs.sendMessage.mock.calls[0][1];
      expect(message.action).toBe('showNotification');
      expect(message.data.type).toBe('error');
      expect(message.data.title).toBe('SaveIt: Failed');
      expect(message.data.message).toBe(`Failed to send: ${testUrl}`);
      expect(message.data.autoClose).toBe(false);
    });
    
    test('showNotification should call showSuccessNotification for success', async () => {
      await background.showNotification(true, testTitle);
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
      const message = chrome.tabs.sendMessage.mock.calls[0][1];
      expect(message.data.type).toBe('success');
      expect(message.data.title).toBe('SaveIt: Sent!');
    });
    
    test('showNotification should call showErrorNotification for failure', async () => {
      const errorMessage = 'Test error';
      
      await background.showNotification(false, errorMessage, testUrl);
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
      const message = chrome.tabs.sendMessage.mock.calls[0][1];
      expect(message.data.type).toBe('error');
      expect(message.data.title).toBe('SaveIt: Failed');
    });
  });
});