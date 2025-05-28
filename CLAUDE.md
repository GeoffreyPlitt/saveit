# SaveIt Chrome Extension - Development Guidelines

This file contains development guidelines and tips for working on the SaveIt Chrome Extension project.

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

### Jest Test Setup
- Use Jest for unit testing
- Test files in `__tests__/` directory
- Focus on testing `utils.js` functions and storage operations
- Mock Chrome APIs using `jest.mock()`

### GitHub Actions Integration
- Run tests on every PR and push to main
- Include codecov.io integration for coverage reporting
- Save coverage report as `coverage.txt` artifact

### Test Coverage Expectations
- Target: >80% code coverage
- Critical paths: webhook sending, retry logic, error handling
- Mock all Chrome extension APIs in tests

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

### Phase Implementation
1. **Phase 0**: Documentation and project setup ✅
2. **Phase 1**: Manifest, basic structure, storage setup
3. **Phase 2**: Context menu, webhook POST logic, retry mechanism
4. **Phase 3**: Options page, popup, error details page
5. **Phase 4**: Testing setup, Jest tests, GitHub Actions
6. **Phase 5**: Optimization, Chrome Web Store preparation

### Git Workflow
- Feature branches for each phase: `claude/phase-1`, `claude/phase-2`, etc.
- Commit frequently with descriptive messages
- Test functionality after each phase
- Always run linting and tests before pushing

### Before Completing Each Phase
- [ ] Test extension functionality manually in Chrome
- [ ] Run any available linting tools
- [ ] Verify all files are properly committed
- [ ] Update progress in GitHub issue comments

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


## Also
- When I ask you to make branches for features/bugs, always create a PR when you're done.
