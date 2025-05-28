// Mock Chrome extension APIs

// Setup chrome.storage mock
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
    getURL: jest.fn((path) => `chrome-extension://mock-extension-id/${path}`)
  },
  notifications: {
    create: jest.fn()
  }
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Default implementations for storage mocks
  chrome.storage.sync.get.mockImplementation((keys) => {
    const result = {};
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = null;
      });
    } else if (typeof keys === 'string') {
      result[keys] = null;
    }
    return Promise.resolve(result);
  });
  
  chrome.storage.local.get.mockImplementation((keys) => {
    const result = {};
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = null;
      });
    } else if (typeof keys === 'string') {
      result[keys] = null;
    }
    return Promise.resolve(result);
  });
  
  chrome.storage.sync.set.mockImplementation(() => Promise.resolve());
  chrome.storage.local.set.mockImplementation(() => Promise.resolve());
});

// Mock fetch API
global.fetch = jest.fn();
global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || '';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map(Object.entries(init.headers || {}));
  }
  
  text() {
    return Promise.resolve(this.body);
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
};

// Reset fetch mock before each test
beforeEach(() => {
  fetch.mockReset();
});