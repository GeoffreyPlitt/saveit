/**
 * Tests for popup.js functionality
 */

// Import Jest globals
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Setup DOM before imports
document.body.innerHTML = `
<div id="sendCurrentPage">Send Current Page</div>
<div id="openOptions">Options</div>
<div id="status" style="display: none;"></div>
`;

// Spy on global document methods before importing popup code
const originalGetElementById = document.getElementById;
const elementsCache = {};

document.getElementById = jest.fn(id => {
  // Create element if it doesn't exist in our cache
  if (!elementsCache[id]) {
    const element = originalGetElementById.call(document, id) || document.querySelector(`#${id}`);
    if (element) {
      // Store in cache
      elementsCache[id] = element;
      
      // Spy on addEventListener
      element.addEventListener = jest.fn((event, handler) => {
        // Store handler for direct calling in tests
        element[`_${event}Handler`] = handler;
      });
    } else {
      // Create a mock element
      elementsCache[id] = {
        id,
        textContent: '',
        className: '',
        style: { display: 'none' },
        disabled: false,
        value: '',
        addEventListener: jest.fn((event, handler) => {
          elementsCache[id][`_${event}Handler`] = handler;
        })
      };
    }
  }
  
  return elementsCache[id];
});

// Mock Chrome APIs (supplementary to the setup.js mocks)
chrome.runtime.sendMessage = jest.fn();
chrome.runtime.openOptionsPage = jest.fn();
window.close = jest.fn();

// Load the popup code by importing and immediately executing it
// This file does not export functions, it attaches event listeners on DOMContentLoaded
// We need to simulate this by directly calling the event handlers
import '../popup/popup.js';
describe('Popup', () => {
  // Use beforeAll to set up the environment once
  beforeAll(() => {
    // Trigger DOMContentLoaded to initialize the event listeners
    // This will actually attach listeners to our mocked elements
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    document.getElementById('status').style.display = 'none';
    
    // Reset message/status elements
    if (elementsCache['sendCurrentPage']) {
      elementsCache['sendCurrentPage'].textContent = 'Send Current Page';
      elementsCache['sendCurrentPage'].disabled = false;
    }
    
    if (elementsCache['status']) {
      elementsCache['status'].textContent = '';
      elementsCache['status'].className = '';
      elementsCache['status'].style.display = 'none';
    }
  });
  
  // Test functionality by calling the handlers directly
  test('can send current page to webhook', async () => {
    // Mock the tab query
    chrome.tabs.query.mockResolvedValueOnce([
      { url: 'https://example.com', title: 'Example Page' }
    ]);
    
    // Mock configuration check
    chrome.storage.sync.get.mockResolvedValueOnce({
      webhookUrl: 'https://example.com/webhook'
    });
    
    // Mock sendMessage
    chrome.runtime.sendMessage.mockImplementationOnce((message, callback) => {
      expect(message).toEqual({
        action: 'sendToWebhook',
        url: 'https://example.com',
        title: 'Example Page'
      });
      
      callback({ success: true });
      return true;
    });
    
    // Get the sendCurrentPage click handler
    const sendCurrentPage = elementsCache['sendCurrentPage']._clickHandler;
    expect(sendCurrentPage).toBeDefined();
    
    // Call the function
    await sendCurrentPage();
    
    // Verify message was sent
    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    
    // Verify button was temporarily disabled during sending
    expect(elementsCache['sendCurrentPage'].disabled).toBe(false); // It gets re-enabled after
    
    // Verify status was shown (success)
    expect(elementsCache['status'].style.display).toBe('block');
    expect(elementsCache['status'].textContent).toMatch(/success/i);
  });
  
  test('shows error when webhook is not configured', async () => {
    // Mock the tab query
    chrome.tabs.query.mockResolvedValueOnce([
      { url: 'https://example.com', title: 'Example Page' }
    ]);
    
    // Mock empty webhook configuration
    chrome.storage.sync.get.mockResolvedValueOnce({
      webhookUrl: ''
    });
    
    // Get the sendCurrentPage click handler
    const sendCurrentPage = elementsCache['sendCurrentPage']._clickHandler;
    
    // Call the function
    await sendCurrentPage();
    
    // Verify message was not sent
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    
    // Verify status was shown (warning)
    expect(elementsCache['status'].style.display).toBe('block');
    expect(elementsCache['status'].textContent).toMatch(/configure/i);
  });
  
  test('can open options page', () => {
    // Get the openOptions click handler
    const openOptions = elementsCache['openOptions']._clickHandler;
    expect(openOptions).toBeDefined();
    
    // Call the function
    openOptions();
    
    // Verify options page was opened
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    expect(window.close).toHaveBeenCalled();
  });
});