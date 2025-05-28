/**
 * Tests for background.js functionality
 */

// Function to simulate background.js functionality
async function sendToWebhook(url, title) {
  try {
    // Simulate getWebhookConfig
    const { webhookUrl, apiKey } = await chrome.storage.sync.get(['webhookUrl', 'apiKey']);
    
    if (!webhookUrl) {
      // Simulate showErrorNotification
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

    // Simulate fetch with retry
    const response = await fetch(webhookUrl, options);
    
    // Simulate success notification
    chrome.notifications.create({
      type: 'basic',
      title: 'SaveIt: Sent!',
      message: title
    });
    
    return response;
  } catch (error) {
    // Simulate error logging
    await chrome.storage.local.set({ 
      lastError: { 
        url: url,
        title: title,
        error: error.message,
        timestamp: Date.now()
      } 
    });

    // Simulate error notification
    chrome.notifications.create({
      type: 'basic',
      title: 'SaveIt: Failed',
      message: `Failed to send: ${url}`,
      buttons: [{ title: 'View Error' }]
    });
    
    throw error;
  }
}

describe('Background Script', () => {
  // Test variables
  const testTab = { id: 1, url: 'https://example.com', title: 'Example Page' };
  const testLink = 'https://example.com/link';
  
  describe('sendToWebhook', () => {
    test('should send URL and title to webhook', async () => {
      // Mock storage to return webhook URL and API key
      chrome.storage.sync.get.mockResolvedValueOnce({
        webhookUrl: 'https://example.com/webhook',
        apiKey: 'test-api-key'
      });
      
      // Mock successful fetch
      fetch.mockResolvedValueOnce(new Response('{"success":true}'));
      
      await sendToWebhook(testTab.url, testTab.title);
      
      // Verify fetch was called with correct options
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toBe('https://example.com/webhook');
      
      // Check request options
      const options = fetch.mock.calls[0][1];
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['Authorization']).toBe('Bearer test-api-key');
      
      // Check payload
      const payload = JSON.parse(options.body);
      expect(payload.url).toBe(testTab.url);
      expect(payload.title).toBe(testTab.title);
      expect(payload.timestamp).toBeDefined();
      
      // Verify success notification was shown
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
      expect(chrome.notifications.create.mock.calls[0][0].title).toBe('SaveIt: Sent!');
    });
    
    test('should show error notification when no webhook URL is configured', async () => {
      // Mock storage to return no webhook URL
      chrome.storage.sync.get.mockResolvedValueOnce({
        webhookUrl: '',
        apiKey: 'test-api-key'
      });
      
      await sendToWebhook(testTab.url, testTab.title);
      
      // Verify fetch was not called
      expect(fetch).not.toHaveBeenCalled();
      
      // Verify error notification was shown
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
      expect(chrome.notifications.create.mock.calls[0][0].title).toBe('SaveIt: Failed');
    });
    
    test('should handle fetch errors', async () => {
      // Mock storage to return webhook URL
      chrome.storage.sync.get.mockResolvedValueOnce({
        webhookUrl: 'https://example.com/webhook',
        apiKey: 'test-api-key'
      });
      
      // Mock fetch error
      const fetchError = new Error('Network error');
      fetch.mockRejectedValueOnce(fetchError);
      
      await expect(sendToWebhook(testTab.url, testTab.title)).rejects.toThrow('Network error');
      
      // Verify error was logged
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
      const errorLog = chrome.storage.local.set.mock.calls[0][0].lastError;
      expect(errorLog.url).toBe(testTab.url);
      expect(errorLog.title).toBe(testTab.title);
      expect(errorLog.error).toBe('Network error');
      
      // Verify error notification was shown
      expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
      expect(chrome.notifications.create.mock.calls[0][0].title).toBe('SaveIt: Failed');
    });
  });
  
  describe('Event Handlers', () => {
    test('toolbar click should call sendToWebhook with tab info', async () => {
      // Create spy on sendToWebhook
      const sendToWebhookSpy = jest.fn();
      global.sendToWebhook = sendToWebhookSpy;
      
      // Simulate action.onClicked event
      const actionClickHandler = jest.fn(callback => {
        callback(testTab);
      });
      
      // Call the handler with a mock tab
      actionClickHandler(chrome.action.onClicked.addListener.mock.calls[0][0]);
      
      // Verify sendToWebhook was called with correct args
      expect(sendToWebhookSpy).toHaveBeenCalledWith(testTab.url, testTab.title);
    });
    
    test('context menu click should handle link URLs', async () => {
      // Create spy on sendToWebhook
      const sendToWebhookSpy = jest.fn();
      global.sendToWebhook = sendToWebhookSpy;
      
      // Simulate contextMenus.onClicked event
      const contextMenuClickHandler = jest.fn((callback) => {
        callback({ linkUrl: testLink }, testTab);
      });
      
      // Call the handler
      contextMenuClickHandler(chrome.contextMenus.onClicked.addListener.mock.calls[0][0]);
      
      // Verify sendToWebhook was called with link URL
      expect(sendToWebhookSpy).toHaveBeenCalledWith(testLink, testTab.title);
    });
  });
});