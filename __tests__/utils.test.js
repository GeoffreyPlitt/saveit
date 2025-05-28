/**
 * Tests for utils.js functionality
 */

// Import the utility functions we're testing
const fs = require('fs');
const path = require('path');

// Read the utils.js file content
const utilsPath = path.join(__dirname, '../utils.js');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');

// Evaluate the file content to get the functions in the test context
// This is a workaround since we're not using module exports in the extension
eval(utilsContent);

describe('fetchWithRetry', () => {
  // Setup test variables
  const testUrl = 'https://example.com/webhook';
  const testOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'data' })
  };

  test('should resolve on successful fetch', async () => {
    // Mock a successful fetch response
    fetch.mockResolvedValueOnce(new Response('{"success":true}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    const response = await fetchWithRetry(testUrl, testOptions);
    
    // Verify fetch was called with correct arguments
    expect(fetch).toHaveBeenCalledWith(testUrl, testOptions);
    expect(fetch).toHaveBeenCalledTimes(1);
    
    // Verify response
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
  });

  test('should retry on network failure', async () => {
    // Mock 2 failures followed by success
    fetch.mockRejectedValueOnce(new Error('Network error'));
    fetch.mockRejectedValueOnce(new Error('Network error'));
    fetch.mockResolvedValueOnce(new Response('{"success":true}', { status: 200 }));

    // Reduce retry delay for testing
    const response = await fetchWithRetry(testUrl, testOptions, 3, 50);
    
    // Verify fetch was called 3 times
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(response.ok).toBe(true);
  });

  test('should throw after exhausting retries', async () => {
    // Mock consistent failures
    const networkError = new Error('Network error');
    fetch.mockRejectedValue(networkError);

    // Expect the function to eventually throw
    await expect(fetchWithRetry(testUrl, testOptions, 3, 50))
      .rejects.toEqual(networkError);
    
    // Verify fetch was called the expected number of times
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  test('should handle non-ok response', async () => {
    // Mock HTTP error response
    fetch.mockResolvedValueOnce(new Response('{"error":"Unauthorized"}', { 
      status: 401, 
      statusText: 'Unauthorized'
    }));

    // Expect error with HTTP status
    await expect(fetchWithRetry(testUrl, testOptions))
      .rejects.toThrow('HTTP 401: Unauthorized');
    
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('Storage utilities', () => {
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
      timestamp: Date.now() 
    };
    
    chrome.storage.local.get.mockResolvedValueOnce({ lastError: mockError });
    
    const error = await getLastError();
    
    expect(chrome.storage.local.get).toHaveBeenCalledWith(['lastError']);
    expect(error).toEqual(mockError);
  });
});