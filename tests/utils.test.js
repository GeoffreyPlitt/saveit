/**
 * Tests for utils.js functionality
 * 
 * @jest-environment jsdom
 */

// Import Vitest globals
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Import the actual functions from utils.js
import { 
  simpleFetch,
  getWebhookConfig,
  saveWebhookConfig,
  logError,
  getLastError
} from '../src/utils.js';

describe('simpleFetch', () => {
  // Setup test variables
  const testUrl = 'https://example.com/webhook';
  const testOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'data' })
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should resolve on successful fetch', async () => {
    // Mock a successful fetch response
    fetch.mockResolvedValueOnce(new Response('{"success":true}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    const response = await simpleFetch(testUrl, testOptions);
    
    // Verify fetch was called with correct arguments
    expect(fetch).toHaveBeenCalledWith(testUrl, testOptions);
    expect(fetch).toHaveBeenCalledTimes(1);
    
    // Verify response
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
  });

  test('should throw on network failure', async () => {
    // Mock network failure
    const networkError = new Error('Network error');
    fetch.mockRejectedValueOnce(networkError);

    // Expect the function to throw immediately
    await expect(simpleFetch(testUrl, testOptions))
      .rejects.toEqual(networkError);
    
    // Verify fetch was called only once
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('should handle non-ok response', async () => {
    // Mock a non-OK response
    fetch.mockResolvedValueOnce(new Response('{"error":"Unauthorized"}', { 
      status: 401,
      statusText: 'Unauthorized',
      ok: false
    }));
    
    // Expect the function to throw with HTTP error
    await expect(simpleFetch(testUrl, testOptions))
      .rejects.toThrow('HTTP 401: Unauthorized');
    
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('Storage utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('getWebhookConfig should retrieve config from storage', async () => {
    // Mock storage response
    const mockConfig = { webhookUrl: 'https://example.com/hook', apiKey: 'test-api-key' };
    chrome.storage.sync.get.mockResolvedValueOnce(mockConfig);

    const config = await getWebhookConfig();
    
    expect(chrome.storage.sync.get).toHaveBeenCalledWith(['webhookUrl', 'apiKey']);
    expect(config).toEqual(mockConfig);
  });

  test('saveWebhookConfig should store config', async () => {
    const webhookUrl = 'https://example.com/hook';
    const apiKey = 'test-api-key';

    await saveWebhookConfig(webhookUrl, apiKey);
    
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ webhookUrl, apiKey });
  });

  test('logError should store error details', async () => {
    const errorDetails = { error: 'Test error', url: 'https://example.com' };
    
    await logError(errorDetails);
    
    // Verify error was stored with timestamp
    expect(chrome.storage.local.set).toHaveBeenCalled();
    const setCall = chrome.storage.local.set.mock.calls[0][0];
    expect(setCall.lastError.error).toBe('Test error');
    expect(setCall.lastError.url).toBe('https://example.com');
    expect(setCall.lastError.timestamp).toBeDefined();
  });

  test('getLastError should retrieve stored error', async () => {
    const mockError = { 
      error: 'Test error', 
      url: 'https://example.com', 
      timestamp: new Date().toISOString() 
    };
    
    chrome.storage.local.get.mockResolvedValueOnce({ lastError: mockError });
    
    const error = await getLastError();
    
    expect(chrome.storage.local.get).toHaveBeenCalledWith(['lastError']);
    expect(error).toEqual(mockError);
  });
});