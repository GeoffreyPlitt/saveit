# SaveIt Chrome Extension - Development Guidelines

## Project Overview
SaveIt is a minimalist Chrome extension that sends webpage URLs, titles, and timestamps to configured webhooks. Built with vanilla JavaScript (zero dependencies) using Manifest V3.

## Development Principles

### Code Standards
- **Zero Dependencies**: Pure vanilla JavaScript, HTML, and CSS only
- **Manifest V3**: Modern Chrome extension architecture
- **< 500 Lines Total**: Target to keep entire codebase under 500 lines
- **No Comments**: Code should be self-documenting unless absolutely necessary
- **No Frameworks**: Avoid React, Vue, jQuery, etc.

### File Structure Requirements
```
saveit/
├── manifest.json          # Chrome extension manifest
├── background.js          # Service worker (context menus, webhooks, retries)
├── utils.js              # Shared utilities (fetchWithRetry function)
├── options/
│   ├── options.html      # Webhook URL/token configuration
│   └── options.js        # Settings persistence logic
├── popup/
│   ├── popup.html        # Simple "Options" button
│   └── popup.js          # Popup logic
├── error/
│   └── error.html        # Error details display page
├── icons/                # 16px, 48px, 128px extension icons
└── tests/                # Jest tests for core functions
```

## Technical Implementation Notes

### Chrome Extension APIs
- `chrome.storage.sync` - Cross-device webhook URL/token sync
- `chrome.storage.local` - Error details storage (last error only)
- `chrome.contextMenus` - Right-click "Send to Webhook" menu
- `chrome.notifications` - Success/error toast notifications
- `chrome.action` - Toolbar icon click handling
- `chrome.tabs` - Service worker navigation to error details

### Core Features Implementation

#### 1. Webhook Configuration
- Single webhook URL + Bearer token inputs
- Save via `chrome.storage.sync` for cross-device syncing
- Simple HTML form with two text inputs and save button

#### 2. Context Menu Integration
- Register "Send to Webhook" on installation
- Support both links (`info.linkUrl`) and pages (`tab.url`)

#### 3. Toolbar Icon Click
- Same webhook send logic as context menu
- Send current page URL and title

#### 4. HTTP POST Logic
```javascript
// JSON payload format
{
  "url": "https://example.com",
  "title": "Example Page Title",
  "timestamp": 1716859200000
}

// Headers
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

#### 5. Retry Logic
- 3 retries with 3-second delays between failures
- Handle both network errors and non-2xx HTTP responses
- Implement in `utils.js` as `fetchWithRetry(url, options, retries=3, delay=3000)`

#### 6. Notifications
- **Success (2xx/3xx)**: Green notification with page title
- **Failure**: Red notification with URL and "View Error" button
- Use Service Worker Navigation (option 1) for error details

#### 7. Error Handling
- Store last error in `chrome.storage.local`
- Include headers, status code, and response body
- Display in dedicated error details page
- Handle notification button clicks via service worker

## Testing Requirements

### Jest Setup
- Full Jest configuration with GitHub Actions CI
- Codecov.io integration with badge
- Save coverage report as `coverage.txt` from GitHub Actions
- Test files in `/tests/` directory

### Test Coverage
- `fetchWithRetry` function (network errors, retries, delays)
- Storage operations (`chrome.storage.sync/local` mocking)
- JSON payload construction
- Error handling edge cases

### GitHub Actions
```yaml
# Required CI pipeline
- Install dependencies
- Run ESLint
- Run Jest tests
- Generate coverage report
- Upload to codecov.io
- Save coverage.txt artifact
```

## Development Workflow

### Phase Implementation
1. **Phase 0**: README, CLAUDE.md, project setup ✅
2. **Phase 1**: manifest.json, storage configuration, icon integration
3. **Phase 2**: Context menu, webhook POST logic with retries
4. **Phase 3**: Options page, error details, notifications
5. **Phase 4**: Jest tests, linting, GitHub Actions CI
6. **Phase 5**: Optimization and future improvements

### Code Quality Gates
- **ESLint**: Must pass before PR merge
- **Jest Tests**: 100% test coverage on core functions
- **Manual Testing**: Load unpacked extension and verify all features
- **Performance**: Keep background script minimal for battery life

## Chrome Extension Best Practices

### Security
- Never log or expose Bearer tokens
- Validate webhook URLs before storage
- Handle CORS and network errors gracefully
- Use content security policy in manifest

### Performance
- Minimize background script execution
- Use event-driven service worker pattern
- Debounce rapid successive calls
- Clear unused storage periodically

### User Experience
- Clear success/error feedback
- Non-intrusive notifications
- Simple, focused UI
- Fast response times (< 1 second for local actions)

## Debugging Tips

### Chrome Extension DevTools
- `chrome://extensions/` → Developer mode → Inspect service worker
- Check Console for background script errors
- Use `chrome.storage` inspector for data persistence
- Test context menus on various page types

### Common Issues
- **Service Worker**: Must register context menus in `chrome.runtime.onInstalled`
- **Notifications**: Require `notifications` permission in manifest
- **Storage**: `sync` has quota limits, `local` is unlimited
- **Fetch**: Can fail due to CORS, network, or server errors

## Deployment Checklist

### Chrome Web Store Preparation
- [ ] 128x128 icon in Store Developer Dashboard
- [ ] Privacy policy (if collecting user data)
- [ ] Store listing screenshots and description
- [ ] Version number bump in `manifest.json`
- [ ] Test in fresh Chrome profile

### Repository Maintenance
- [ ] Update README with latest features
- [ ] Tag releases with semantic versioning
- [ ] Maintain CHANGELOG.md for user-facing changes
- [ ] GitHub Actions passing on all PRs

## Future Enhancement Ideas
- Batch URL sending
- Custom JSON payload templates
- Multiple webhook endpoints
- Usage analytics dashboard
- Export/import configuration
- Keyboard shortcuts
- Dark mode support