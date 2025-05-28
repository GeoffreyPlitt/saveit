# SaveIt Chrome Extension 💾

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-brightgreen)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/GeoffreyPlitt/saveit)](https://github.com/GeoffreyPlitt/saveit/issues)
[![Build Status](https://github.com/GeoffreyPlitt/saveit/workflows/CI/badge.svg)](https://github.com/GeoffreyPlitt/saveit/actions)
[![codecov](https://codecov.io/gh/GeoffreyPlitt/saveit/branch/main/graph/badge.svg)](https://codecov.io/gh/GeoffreyPlitt/saveit)

A minimalist Chrome extension that sends webpage URLs, titles, and timestamps to your configured webhook with retries and error notifications.

## Features ✨

- **Webhook Integration**: Configure a single webhook URL with Bearer token authentication
- **Multiple Triggers**: 
  - Right-click links → "Send to Webhook" context menu
  - Click toolbar icon → Send current page to webhook
- **Smart Retries**: 3 automatic retries with 3-second delays on failures
- **Visual Feedback**: Green success toasts and red error notifications with details
- **Cross-Device Sync**: Settings sync across Chrome instances via `chrome.storage.sync`
- **Error Details**: View complete error information including headers, status, and response

## Technical Specifications 🔧

### JSON Payload Format
```json
{
  "url": "https://example.com",
  "title": "Example Page Title", 
  "timestamp": 1716859200000
}
```

### HTTP Headers
- `Content-Type: application/json`
- `Authorization: Bearer <your-token>`

### Architecture
- **Manifest V3** Chrome extension
- **Vanilla JavaScript** (zero dependencies)
- **Service Worker** background script for context menus and webhook calls
- **Chrome Storage API** for settings persistence
- **Chrome Notifications API** for user feedback

## Installation 📦

### Development Setup
1. Clone this repository:
   ```bash
   git clone https://github.com/GeoffreyPlitt/saveit.git
   cd saveit
   ```

2. Install dependencies and run tests:
   ```bash
   npm install
   npm test
   ```

3. Load the unpacked extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this directory

### Production Install
Extension will be available on Chrome Web Store soon.

## Usage 🚀

1. **Setup**: Click the SaveIt icon → Options → Configure webhook URL and Bearer token
2. **Send Pages**: Click the SaveIt toolbar icon to send the current page
3. **Send Links**: Right-click any link → "Send to Webhook"
4. **View Errors**: Click error notification buttons to see detailed failure information

## Project Structure 📁

```
saveit/
├── manifest.json          # Chrome extension manifest
├── background.js          # Service worker for webhooks/context menus
├── utils.js              # Shared utilities (fetchWithRetry)
├── options/
│   ├── options.html      # Settings configuration page
│   └── options.js        # Settings logic
├── popup/
│   ├── popup.html        # Toolbar popup
│   └── popup.js          # Popup logic
├── error/
│   └── error.html        # Error details display
└── icons/                # Extension icons (16px, 48px, 128px)
```

## Development 🛠️

### Testing
```bash
npm test              # Run Jest tests
npm run test:watch    # Watch mode for development
```

### Code Quality
```bash
npm run lint          # ESLint code checking
npm run lint:fix      # Auto-fix linting issues
```

### Building
No build step required - pure vanilla JavaScript.

## Contributing 🤝

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap 🗺️

- [ ] Batch sending for multiple URLs
- [ ] Custom payload templates
- [ ] Multiple webhook support
- [ ] Export/import configuration
- [ ] Analytics dashboard

---

Built with ❤️ for simple, efficient webhook integration.
