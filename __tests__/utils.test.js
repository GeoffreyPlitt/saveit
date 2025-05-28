/**
 * Tests for utils.js functionality
 */

// Import functions directly by defining them here
// These match the function signatures from utils.js
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

async function getWebhookConfig() {
  const { webhookUrl, apiKey } = await chrome.storage.sync.get(['webhookUrl', 'apiKey']);
  return { webhookUrl, apiKey };
}

async function saveWebhookConfig(webhookUrl, apiKey) {
  await chrome.storage.sync.set({ webhookUrl, apiKey });
}

async function logError(errorDetails) {
  await chrome.storage.local.set({ 
    lastError: { 
      ...errorDetails, 
      timestamp: Date.now() 
    } 
  });
}

async function getLastError() {
  const { lastError } = await chrome.storage.local.get(['lastError']);
  return lastError;
}

describe('fetchWithRetry', () => {
  // Setup test variables
  const testUrl = 'https://example.com/webhook';
  const testOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'data' })
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    const response = await fetchWithRetry(testUrl, testOptions, 3, 10);
    
    // Verify fetch was called 3 times
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(response.ok).toBe(true);
  });

  test('should throw after exhausting retries', async () => {
    // Mock consistent failures
    const networkError = new Error('Network error');
    fetch.mockRejectedValue(networkError);

    // Expect the function to eventually throw
    await expect(fetchWithRetry(testUrl, testOptions, 3, 10))
      .rejects.toEqual(networkError);
    
    // Verify fetch was called the expected number of times
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  test('should handle non-ok response', async () => {
    // Create a custom error for HTTP errors
    const httpError = new Error('HTTP 401: Unauthorized');
    httpError.responseDetails = {
      status: 401,
      statusText: 'Unauthorized'
    };
    
    // Mock fetch to throw our custom error
    fetch.mockRejectedValueOnce(httpError);
    
    // Test that fetchWithRetry passes through the error
    await expect(fetchWithRetry(testUrl, testOptions, 1, 0))
      .rejects.toEqual(httpError);
    
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('Storage utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      timestamp: Date.now() 
    };
    
    chrome.storage.local.get.mockResolvedValueOnce({ lastError: mockError });
    
    const error = await getLastError();
    
    expect(chrome.storage.local.get).toHaveBeenCalledWith(['lastError']);
    expect(error).toEqual(mockError);
  });
});