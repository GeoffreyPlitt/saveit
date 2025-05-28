/**
 * Tests for options.js functionality
 */

// Import Jest globals
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock DOM setup
document.body.innerHTML = `
<form id="optionsForm">
  <input id="webhookUrl" type="url" value="https://example.com/webhook">
  <input id="apiKey" type="text" value="test-api-key">
  <button type="submit">Save</button>
</form>
<button id="testButton">Test Webhook</button>
<div id="status" style="display: none;"></div>
<div id="webhookUrlValidation" class="input-validation"></div>
<div id="apiKeyValidation" class="input-validation"></div>
`;

// Spy on global document methods before importing options code
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
        value: id === 'webhookUrl' ? 'https://example.com/webhook' : (id === 'apiKey' ? 'test-api-key' : ''),
        addEventListener: jest.fn((event, handler) => {
          elementsCache[id][`_${event}Handler`] = handler;
        })
      };
    }
  }
  
  return elementsCache[id];
});

// Mock fetch API
global.fetch = jest.fn();
global.AbortController = class AbortController {
  constructor() {
    this.signal = { aborted: false };
  }
  abort() {
    this.signal.aborted = true;
  }
};

// Mock URL constructor
global.URL = class URL {
  constructor(url) {
    if (!url || typeof url !== 'string' || !url.includes('://')) {
      throw new Error('Invalid URL');
    }
    this.href = url;
    this.protocol = url.startsWith('https:') ? 'https:' : 'http:';
    this.hostname = url.split('://')[1].split('/')[0];
    this.pathname = '/' + (url.split('://')[1].split('/').slice(1).join('/') || '');
  }
};

// Load the options code by importing and immediately executing it
import '../options/options.js';
describe('Options', () => {
  // Use beforeAll to set up the environment once
  beforeAll(() => {
    // Trigger DOMContentLoaded to initialize the event listeners
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset elements
    if (elementsCache['status']) {
      elementsCache['status'].textContent = '';
      elementsCache['status'].className = '';
      elementsCache['status'].style.display = 'none';
    }
    
    if (elementsCache['webhookUrl']) {
      elementsCache['webhookUrl'].value = 'https://example.com/webhook';
      elementsCache['webhookUrl'].className = '';
    }
    
    if (elementsCache['apiKey']) {
      elementsCache['apiKey'].value = 'test-api-key';
      elementsCache['apiKey'].className = '';
    }
    
    if (elementsCache['testButton']) {
      elementsCache['testButton'].disabled = false;
      elementsCache['testButton'].textContent = 'Test Webhook';
    }
    
    if (elementsCache['webhookUrlValidation']) {
      elementsCache['webhookUrlValidation'].className = 'input-validation';
      elementsCache['webhookUrlValidation'].textContent = '';
    }
    
    if (elementsCache['apiKeyValidation']) {
      elementsCache['apiKeyValidation'].className = 'input-validation';
      elementsCache['apiKeyValidation'].textContent = '';
    }
  });
  
  // Test functionality by calling the handlers directly
  test('can save settings', async () => {
    // Create mock event
    const mockEvent = { preventDefault: jest.fn() };
    
    // Get the save settings handler
    const saveSettings = elementsCache['optionsForm']._submitHandler;
    expect(saveSettings).toBeDefined();
    
    // Call the function
    await saveSettings(mockEvent);
    
    // Verify preventDefault was called
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    
    // Verify storage was updated
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      webhookUrl: 'https://example.com/webhook',
      apiKey: 'test-api-key'
    });
    
    // Verify status was shown
    expect(elementsCache['status'].style.display).toBe('block');
    expect(elementsCache['status'].textContent).toMatch(/success/i);
  });
  
  test('validates empty webhook URL during save', async () => {
    // Set empty webhook URL
    elementsCache['webhookUrl'].value = '';
    
    // Create mock event
    const mockEvent = { preventDefault: jest.fn() };
    
    // Get the save settings handler
    const saveSettings = elementsCache['optionsForm']._submitHandler;
    
    // Call the function
    await saveSettings(mockEvent);
    
    // Verify storage was not updated
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    
    // Verify error status was shown
    expect(elementsCache['status'].style.display).toBe('block');
    expect(elementsCache['status'].className).toContain('error');
  });
  
  test('validates invalid webhook URL during save', async () => {
    // Set invalid webhook URL
    elementsCache['webhookUrl'].value = 'not-a-url';
    
    // Create mock event
    const mockEvent = { preventDefault: jest.fn() };
    
    // Get the save settings handler
    const saveSettings = elementsCache['optionsForm']._submitHandler;
    
    // Call the function
    await saveSettings(mockEvent);
    
    // Verify storage was not updated
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    
    // Verify error status was shown
    expect(elementsCache['status'].style.display).toBe('block');
    expect(elementsCache['status'].className).toContain('error');
  });
  
  test('can test webhook successfully', async () => {
    // Mock fetch to return success
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"success":true}')
    });
    
    // Get the test webhook handler
    const testWebhook = elementsCache['testButton']._clickHandler;
    expect(testWebhook).toBeDefined();
    
    // Call the function
    await testWebhook();
    
    // Verify fetch was called correctly
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('https://example.com/webhook');
    
    // Verify request options
    const options = fetch.mock.calls[0][1];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['Authorization']).toBe('Bearer test-api-key');
    
    // Verify button was restored after test
    expect(elementsCache['testButton'].disabled).toBe(false);
    expect(elementsCache['testButton'].textContent).not.toContain('Testing');
    
    // Verify success status was shown
    expect(elementsCache['status'].style.display).toBe('block');
    expect(elementsCache['status'].className).toContain('success');
  });
  
  test('can load settings on initialization', async () => {
    // Mock storage to return settings
    chrome.storage.sync.get.mockResolvedValueOnce({
      webhookUrl: 'https://loaded-url.com/webhook',
      apiKey: 'loaded-api-key'
    });
    
    // Get the load settings handler
    const loadSettings = async () => {
      // Re-trigger the DOMContentLoaded event to simulate loading
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
      
      // Wait for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    };
    
    // Call the function
    await loadSettings();
    
    // Verify storage was queried
    expect(chrome.storage.sync.get).toHaveBeenCalledWith(['webhookUrl', 'apiKey']);
    
    // Verify form was populated (would happen in a real DOM)
    // This is difficult to test directly since we're not actually updating the DOM
    // We're just verifying the function was called
  });
});