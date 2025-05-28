/**
 * Test setup file for mocking Chrome extension APIs
 */

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
    onMessage: { addListener: jest.fn() }
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