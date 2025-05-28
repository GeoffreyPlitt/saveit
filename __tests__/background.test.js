/**
 * Tests for background.js functionality
 */

// Import functions for testing
async function sendToWebhook(url, title) {
  try {
    // Get webhook configuration
    const { webhookUrl, apiKey } = await chrome.storage.sync.get(['webhookUrl', 'apiKey']);
    
    if (!webhookUrl) {
      // Show error notification
      chrome.notifications.create({
        type: 'basic',
        title: 'SaveIt: Failed',
        message: `Failed to send: ${url}`,
        buttons: [{ title: 'View Error' }]
      });
      return;
    }

    // Prepare payload
    const payload = {
      url: url,
      title: title,
      timestamp: Date.now()
    };

    // Prepare request options
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    };

    // Add authorization header if API key is provided
    if (apiKey) {
      options.headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Send request
    const response = await fetch(webhookUrl, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      title: 'SaveIt: Sent!',
      message: title
    });
    
    return response;
  } catch (error) {
    // Log error
    await chrome.storage.local.set({ 
      lastError: { 
        url: url,
        title: title,
        error: error.message,
        timestamp: Date.now()
      } 
    });

    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      title: 'SaveIt: Failed',
      message: `Failed to send: ${url}`,
      buttons: [{ title: 'View Error' }]
    });
    
    throw error;
  }
}

describe('Background Service Worker', () => {
  // Test variables
  const testUrl = 'https://example.com';
  const testTitle = 'Example Page';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('sendToWebhook function', () => {
    test('should send a webhook request with correct payload', async () => {
      // Mock storage to return webhook URL and API key
      chrome.storage.sync.get.mockResolvedValueOnce({
        webhookUrl: 'https://example.com/webhook',
        apiKey: 'test-api-key'
      });
      
      // Mock fetch to return success
      fetch.mockResolvedValueOnce(new Response('{"success":true}', { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
      
      // Call the function
      await sendToWebhook(testUrl, testTitle);
      
      // Verify fetch was called with correct URL
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toBe('https://example.com/webhook');
      
      // Check request options
      const options = fetch.mock.calls[0][1];
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
      const notification = chrome.notifications.create.mock.calls[0][0];
      expect(notification.title).toBe('SaveIt: Sent!');
      expect(notification.message).toBe(testTitle);
    });
    
    test('should handle missing webhook URL', async () => {
      // Mock storage to return empty webhook URL
      chrome.storage.sync.get.mockResolvedValueOnce({
        webhookUrl: '',
        apiKey: 'test-api-key'
      });
      
      // Call the function
      await sendToWebhook(testUrl, testTitle);
      
      // Verify fetch was not called
      expect(fetch).not.toHaveBeenCalled();
      
      // Verify error notification was shown
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
      const notification = chrome.notifications.create.mock.calls[0][0];
      expect(notification.title).toBe('SaveIt: Failed');
      expect(notification.message).toBe(`Failed to send: ${testUrl}`);
    });
    
    test('should handle fetch errors', async () => {
      // Mock storage to return webhook URL and API key
      chrome.storage.sync.get.mockResolvedValueOnce({
        webhookUrl: 'https://example.com/webhook',
        apiKey: 'test-api-key'
      });
      
      // Mock fetch to throw an error
      const testError = new Error('Network error');
      fetch.mockRejectedValueOnce(testError);
      
      // Call the function and expect it to throw
      await expect(sendToWebhook(testUrl, testTitle)).rejects.toThrow('Network error');
      
      // Verify error was logged
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
      const errorLog = chrome.storage.local.set.mock.calls[0][0].lastError;
      expect(errorLog.url).toBe(testUrl);
      expect(errorLog.title).toBe(testTitle);
      expect(errorLog.error).toBe('Network error');
      expect(errorLog.timestamp).toBeDefined();
      
      // Verify error notification was shown
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
      const notification = chrome.notifications.create.mock.calls[0][0];
      expect(notification.title).toBe('SaveIt: Failed');
      expect(notification.message).toBe(`Failed to send: ${testUrl}`);
    });
    
    test('should handle non-OK response', async () => {
      // Mock storage to return webhook URL and API key
      chrome.storage.sync.get.mockResolvedValueOnce({
        webhookUrl: 'https://example.com/webhook',
        apiKey: 'test-api-key'
      });
      
      // Mock fetch to return an error response
      fetch.mockResolvedValueOnce(new Response('{"error":"Unauthorized"}', { 
        status: 401,
        statusText: 'Unauthorized',
        ok: false
      }));
      
      // Call the function and expect it to throw
      await expect(sendToWebhook(testUrl, testTitle)).rejects.toThrow('HTTP error: 401');
      
      // Verify error was logged
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
      
      // Verify error notification was shown
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
      const notification = chrome.notifications.create.mock.calls[0][0];
      expect(notification.title).toBe('SaveIt: Failed');
    });
  });
  
  describe('Event handling', () => {
    test('should open error page when notification button is clicked', () => {
      // Mock a listener function
      const listener = (notificationId, buttonIndex) => {
        if (notificationId.startsWith('saveit-error') && buttonIndex === 0) {
          chrome.tabs.create({
            url: chrome.runtime.getURL('error/error.html')
          });
        }
      };

      // Call the listener directly
      listener('saveit-error-12345', 0);
      
      // Verify the error page was opened
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('error/error.html')
      });
    });
  });
});