/**
 * Test setup file for mocking Chrome extension APIs
 */

// Import Vitest globals
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Simple test to avoid error "Your test suite must contain at least one test"
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
      get: vi.fn(),
      set: vi.fn()
    },
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  },
  runtime: {
    getURL: vi.fn(path => `chrome-extension://mock-id/${path}`),
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    openOptionsPage: vi.fn()
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    onButtonClicked: { addListener: vi.fn() }
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: { addListener: vi.fn() }
  },
  action: {
    onClicked: { addListener: vi.fn() }
  },
  tabs: {
    create: vi.fn(),
    query: vi.fn(),
    sendMessage: vi.fn(() => Promise.resolve())
  },
  scripting: {
    executeScript: vi.fn()
  },
  windows: {
    create: vi.fn(() => Promise.resolve({ id: 1 })),
    remove: vi.fn(() => Promise.resolve()),
    getCurrent: vi.fn(() => Promise.resolve({ id: 1 }))
  }
};

// Mock window functions
global.window = global.window || {
  close: vi.fn(),
  setTimeout: global.setTimeout
};

// Mock DOM Environment
if (!global.document) {
  global.document = {
    addEventListener: vi.fn(),
    getElementById: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(),
    createElement: vi.fn(),
    body: {
      appendChild: vi.fn()
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
    addEventListener: vi.fn(),
    getAttribute: vi.fn(),
    setAttribute: vi.fn()
  };
};

// Mock document functions
document.getElementById = vi.fn(id => {
  return createMockElement(id);
});

document.createElement = vi.fn(tagName => {
  return createMockElement('', tagName);
});

// Mock location
global.location = {
  href: 'chrome-extension://mock-id/popup.html'
};

// Mock importScripts for background.js
global.importScripts = vi.fn();

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  
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
global.fetch = vi.fn();
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