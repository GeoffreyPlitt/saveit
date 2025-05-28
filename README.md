# SaveIt - Webhook Manager Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-blue)](https://chrome.google.com/webstore)
[![Tests](https://github.com/GeoffreyPlitt/saveit/workflows/Tests/badge.svg)](https://github.com/GeoffreyPlitt/saveit/actions)
[![Coverage](https://img.shields.io/badge/coverage-0%25-red)](https://github.com/GeoffreyPlitt/saveit)

A minimalist Chrome extension that sends the current page or right-clicked link URL, title, and timestamp to a user-configured webhook as JSON, with retries and error toasts.

## Features

- **Right-click Context Menu**: Right-click a link and choose "Send to Webhook"
- **Toolbar Integration**: Click icon in toolbar to send current page to webhook
- **JSON Payload**: Sends URL, title, and timestamp as structured data
- **Retry Logic**: 3 automatic retries with 3-second delays on failures
- **Visual Feedback**: Success/error toast notifications
- **Cross-device Sync**: Settings sync across Chrome instances via `chrome.storage.sync`

## Technical Specifications

### Core Architecture
- **Manifest V3** Chrome extension
- **Vanilla JS/HTML/CSS** - Zero dependencies
- **Webhook Integration** with Bearer token authentication
- **Error Handling** with detailed error logging and user notifications

### JSON Payload Format
```json
{
  "url": "https://example.com",
  "title": "Example Page",
  "timestamp": 1716859200000
}
```

### File Structure
```
saveit/
├── manifest.json
├── background.js      # Context menu, POST, retries
├── options/
│   ├── options.html   # Webhook URL/token input
│   └── options.js
├── popup/
│   ├── popup.html     # "Options" button
│   └── popup.js
├── error/
│   └── error.html     # Error details page
├── icons/             # Extension icons
└── utils.js           # Shared functions (fetchWithRetry)
```

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/GeoffreyPlitt/saveit.git
   cd saveit
   ```

2. Load unpacked extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `saveit` directory

3. Configure your webhook:
   - Right-click the SaveIt icon in the toolbar
   - Select "Options"
   - Enter your webhook URL and Bearer token
   - Click "Save"

## Usage

### Send Current Page
- Click the SaveIt icon in the Chrome toolbar

### Send Specific Link
- Right-click any link on a webpage
- Select "Send to Webhook" from the context menu

### Configure Settings
- Right-click the extension icon → "Options"
- Enter webhook URL and Bearer token
- Settings automatically sync across your Chrome instances

## Development

See [CLAUDE.md](./CLAUDE.md) for development guidelines and setup instructions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Chrome Web Store publication
- [ ] Custom retry configurations
- [ ] Webhook response logging
- [ ] Bulk URL processing
- [ ] Export/import settings
