/**
 * Test setup file for mocking Chrome extension APIs
 */

// Import Jest globals
import { jest, describe, test, expect } from '@jest/globals';

// Simple test to avoid Jest error "Your test suite must contain at least one test"
describe('Test setup', () => {
  test('Chrome API mocks are defined', () => {
    expect(global.chrome).toBeDefined();
    expect(global.chrome.storage).toBeDefined();
  });
});

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    getURL: jest.fn(path => `chrome-extension://mock-id/${path}`),
    onInstalled: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
    openOptionsPage: jest.fn()
  },
  notifications: {
    create: jest.fn(),
    onButtonClicked: { addListener: jest.fn() }
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: { addListener: jest.fn() }
  },
  action: {
    onClicked: { addListener: jest.fn() }
  },
  tabs: {
    create: jest.fn(),
    query: jest.fn()
  }
};

// Mock window functions
global.window = global.window || {
  close: jest.fn(),
  setTimeout: global.setTimeout
};

// Mock DOM Environment
if (!global.document) {
  global.document = {
    addEventListener: jest.fn(),
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    createElement: jest.fn(),
    body: {
      appendChild: jest.fn()
    }
  };
}

// Create mock elements for DOM interactions
const createMockElement = (id, tagName = 'div') => {
  return {
    id,
    tagName,
    textContent: '',
    className: '',
    style: {
      display: 'none'
    },
    value: '',
    disabled: false,
    addEventListener: jest.fn(),
    getAttribute: jest.fn(),
    setAttribute: jest.fn()
  };
};

// Mock document functions
document.getElementById = jest.fn(id => {
  return createMockElement(id);
});

document.createElement = jest.fn(tagName => {
  return createMockElement('', tagName);
});

// Mock location
global.location = {
  href: 'chrome-extension://mock-id/popup.html'
};

// Mock importScripts for background.js
global.importScripts = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Default implementation for storage.sync.get
  chrome.storage.sync.get.mockImplementation(keys => {
    const result = {};
    
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = null;
      });
    } else if (typeof keys === 'object') {
      Object.keys(keys).forEach(key => {
        result[key] = keys[key]; // Use default value if provided
      });
    } else if (typeof keys === 'string') {
      result[keys] = null;
    }
    
    return Promise.resolve(result);
  });
  
  // Default implementation for storage.local.get
  chrome.storage.local.get.mockImplementation(keys => {
    const result = {};
    
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = null;
      });
    } else if (typeof keys === 'object') {
      Object.keys(keys).forEach(key => {
        result[key] = keys[key]; // Use default value if provided
      });
    } else if (typeof keys === 'string') {
      result[keys] = null;
    }
    
    return Promise.resolve(result);
  });
  
  // Default implementations for storage methods
  chrome.storage.sync.set.mockImplementation(() => Promise.resolve());
  chrome.storage.local.set.mockImplementation(() => Promise.resolve());
  
  // Default implementation for runtime.getURL
  chrome.runtime.getURL.mockImplementation(path => `chrome-extension://mock-id/${path}`);
  
  // Default implementation for tabs.create
  chrome.tabs.create.mockImplementation(() => Promise.resolve());
  
  // Default implementation for notifications.create
  chrome.notifications.create.mockImplementation(() => Promise.resolve());
  
  // Default implementation for tabs.query
  chrome.tabs.query.mockResolvedValue([
    { url: 'https://example.com', title: 'Example Page' }
  ]);
  
  // Default implementation for runtime.sendMessage
  if (chrome.runtime.sendMessage && typeof chrome.runtime.sendMessage.mockImplementation === 'function') {
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) {
        callback({ success: true });
      }
      return true;
    });
  }
});

// Mock fetch API
global.fetch = jest.fn();
global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || '';
    this.ok = init.ok !== undefined ? init.ok : (this.status >= 200 && this.status < 300);
    this.headers = new Map(Object.entries(init.headers || {}));
  }
  
  text() {
    return Promise.resolve(this.body);
  }
  
  json() {
    try {
      return Promise.resolve(JSON.parse(this.body));
    } catch (e) {
      return Promise.resolve({});
    }
  }
};

// Mock URL constructor if not already defined in test
if (!global.URL) {
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
}

// Mock AbortController if not already defined
if (!global.AbortController) {
  global.AbortController = class AbortController {
    constructor() {
      this.signal = { aborted: false };
    }
    abort() {
      this.signal.aborted = true;
    }
  };
}

// Load the actual modules in popup.test.js and options.test.js instead of here
// This will trigger coverage collection when those tests run