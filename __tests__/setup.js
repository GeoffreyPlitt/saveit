/**
 * Minimal setup file for tests
 */

// Mock Chrome API
global.chrome = {
  storage: {
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue({})
    },
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue({})
    }
  }
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});