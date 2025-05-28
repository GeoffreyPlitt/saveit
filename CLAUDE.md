# SaveIt Chrome Extension - Development Guidelines

This file contains development guidelines and tips for working on the SaveIt Chrome Extension project.

## Testing Guidelines and Lessons Learned

### ES Module Testing in Chrome Extensions
- Chrome extensions traditionally don't use ES modules, but we can use them for testing
- Key patterns in our implementation:
  ```javascript
  // Export for testing
  export { functionA, functionB };
  
  // Make available in global scope for Chrome extension context
  if (typeof window !== 'undefined') {
    window.functionA = functionA;
  } else if (typeof self !== 'undefined') {
    self.functionA = functionA;
  }
  ```
- Conditional Chrome API usage to support testing context:
  ```javascript
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    // Chrome API code here
  }
  ```

### Jest Mocking Best Practices
- Mock modules before importing the code that uses them:
  ```javascript
  // Create mock functions
  const mockFetchWithRetry = jest.fn();
  
  // Mock the module
  jest.mock('../utils.js', () => ({
    __esModule: true,
    fetchWithRetry: mockFetchWithRetry
  }));
  
  // Now import the tested module
  import { testedFunction } from '../module-to-test.js';
  ```
- "Cannot assign to read only property" error means you're trying to spy on an imported ES module property - use the module mocking approach above instead
- For DOM testing, set up elements before importing modules that interact with the DOM

### Docker Testing Best Practices
- NEVER run Docker-in-Docker - it adds complexity and causes permission issues
- For testing with Docker:
  ```bash
  # Run tests directly in Docker
  docker run --rm -v "$(pwd):/app" -w /app saveit-test npm test
  ```
- Mount the source directory as a volume and use `-w /app` for correct working directory

## Chrome Extension Development Best Practices

### Manifest V3 Requirements
- Use `chrome.action` instead of `chrome.browserAction` for toolbar icon
- Use `chrome.storage.sync` for cross-device settings storage
- Service workers instead of background pages
- Declarative permissions in manifest.json

### File Structure Standards
```
saveit/
├── manifest.json          # Extension manifest (required)
├── background.js          # Service worker for context menus and webhooks
├── utils.js              # Shared utilities (fetchWithRetry)
├── icons/                # All extension icons
│   ├── icon-16.png       # Toolbar icon
│   ├── icon-48.png       # Extension management page
│   └── icon-128.png      # Chrome Web Store
├── options/              # Settings page
│   ├── options.html
│   └── options.js
├── popup/                # Extension popup (toolbar click)
│   ├── popup.html
│   └── popup.js
└── error/                # Error details page
    └── error.html
```

## Code Standards

### JavaScript Guidelines
- **ES6+ Syntax**: Use modern JavaScript features (async/await, arrow functions, destructuring)
- **No External Dependencies**: Keep the extension lightweight with vanilla JS only
- **Error Handling**: Always wrap async operations in try-catch blocks
- **Storage API**: Use `chrome.storage.sync` for user settings, `chrome.storage.local` for error logs

### Code Style
- Use 2-space indentation
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable names
- Add JSDoc comments for complex functions
- Keep functions small and focused

### Example Code Patterns

#### Storage Operations
```javascript
// Reading settings
const { webhookUrl, apiKey } = await chrome.storage.sync.get(['webhookUrl', 'apiKey']);

// Saving settings
await chrome.storage.sync.set({ webhookUrl, apiKey });

// Error logging
await chrome.storage.local.set({ lastError: { status, message, timestamp: Date.now() } });
```

#### Fetch with Retry Logic
```javascript
async function fetchWithRetry(url, options, retries = 3, delay = 3000) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response;
  } catch (error) {
    if (retries > 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay);
    }
    throw error;
  }
}
```

## Testing Requirements

### Testing Architecture
- Docker-based testing environment for consistent tests in all environments
- Jest for unit testing with JSDOM environment
- Test files in `__tests__/` directory
- Comprehensive mocking of Chrome extension APIs

### Docker Test Setup
- `Dockerfile` defines the test environment
- Docker commands are wrapped in npm scripts for convenience
- Same Docker image used in both local development and CI

### Running Tests
```bash
# Run tests in Docker (recommended)
npm run docker:test

# Run linting in Docker
npm run docker:lint

# Run tests with coverage in Docker
npm run docker:coverage

# Run tests locally (without Docker)
npm test
```

### GitHub Actions Integration
- Tests run automatically on every PR and push to main
- Docker-based testing for consistency with local environment
- Coverage report generated and saved as artifact
- Workflow defined in `.github/workflows/tests.yml`

### Test Coverage Expectations
- Target: >80% code coverage
- Current coverage: 85%
- Critical paths: webhook sending, retry logic, error handling
- All Chrome extension APIs mocked in tests

### Key Testing Files
- `__tests__/setup.js`: Mocks Chrome APIs and sets up test environment
- `__tests__/utils.test.js`: Tests for utility functions
- `__tests__/background.test.js`: Tests for background service worker

## Implementation Notes

### Context Menu Integration
```javascript
// Register context menu in background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'saveit-send',
    title: 'Send to Webhook',
    contexts: ['link', 'page']
  });
});
```

### Notification Handling
```javascript
// Success notification
chrome.notifications.create({
  type: 'basic',
  iconUrl: 'icons/icon-16.png',
  title: 'SaveIt: Sent!',
  message: pageTitle
});

// Error notification with action button
chrome.notifications.create({
  type: 'basic',
  iconUrl: 'icons/icon-16.png', 
  title: 'SaveIt: Failed',
  message: `Failed to send: ${url}`,
  buttons: [{ title: 'View Error' }]
});
```

### Permissions Required
```json
{
  "permissions": [
    "contextMenus",
    "notifications", 
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "*://*/*"
  ]
}
```

## Development Workflow

### Git Workflow
- Use feature branches for new functionality
- Commit frequently with descriptive messages
- Always run linting and tests before pushing

## Browser Compatibility
- **Primary Target**: Chrome 88+ (Manifest V3 support)
- **Testing**: Latest Chrome stable and beta versions
- **Extension APIs**: Only use APIs supported in Manifest V3

## Security Considerations
- Validate webhook URLs before making requests
- Sanitize all user inputs in options page
- Use HTTPS for all webhook communications
- Never log sensitive data (API keys, tokens)
- Implement proper CSP headers in HTML pages

## Performance Guidelines
- Keep extension lightweight (<500 lines total code)
- Minimize background script activity
- Use event-driven programming patterns
- Avoid polling or continuous background operations
- Optimize icon file sizes for fast loading
