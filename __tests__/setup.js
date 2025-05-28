// Simple mock Chrome extension APIs for GitHub Actions workflow

// Setup chrome.storage mock
global.chrome = {
  storage: {
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined)
    },
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined)
    }
  }
};

// Mock fetch API
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});