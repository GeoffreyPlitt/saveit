# SaveIt Chrome Extension Roadmap

This roadmap outlines the planned development path for the SaveIt Chrome Extension, providing a clear timeline and priority sequence for upcoming features and improvements.

## Version 1.0 (Current Release)
- ✅ Basic webhook configuration (URL and Bearer token)
- ✅ Context menu integration for links and pages
- ✅ Toolbar icon click to save current page
- ✅ HTTP POST with JSON payload (URL, title, timestamp)
- ✅ Retry mechanism (3 retries with 3-second delays)
- ✅ Success/failure notifications
- ✅ Error details page
- ✅ Cross-device syncing of settings
- ✅ Test suite with Jest
- ✅ Docker-based testing environment

## Version 1.1 (Next Release - Q3 2025)

### Chrome Web Store Release
- [ ] Create privacy policy
- [ ] Prepare promotional images and copy
- [ ] Develop user documentation
- [ ] Submit for Chrome Web Store review
- [ ] Set up support channels

### Core Improvements
- [ ] Configurable retry settings (attempts, delay, timeout)
- [ ] Offline mode with queue system
- [ ] Improved error categorization and messages
- [ ] Enhanced webhook testing tool

## Version 1.2 (Q4 2025)

### UI/UX Enhancements
- [ ] Dark mode support
- [ ] Customizable notifications
- [ ] Keyboard shortcuts
- [ ] Save confirmation dialog (optional)
- [ ] User interface polish and animations

### Data Flexibility
- [ ] Custom data fields in webhook payload
- [ ] Simple templating system for custom formats
- [ ] URL transformation options (shortening, cleaning)
- [ ] Basic metadata extraction

## Version 2.0 (Q1 2026)

### Advanced Features
- [ ] Multiple webhook profiles
- [ ] Conditional routing based on URL patterns
- [ ] Additional authentication methods
- [ ] Content extraction capabilities
- [ ] Screenshot capture option

### Developer Experience
- [ ] Public API documentation
- [ ] Webhook endpoint templates
- [ ] SDK for custom integrations
- [ ] Enhanced debugging tools

## Version 2.x (Future)

### Ecosystem Expansion
- [ ] Pre-configured templates for popular services
- [ ] Browser sync across platforms
- [ ] Mobile companion apps
- [ ] Integration with automation platforms

### Advanced Organization
- [ ] Tagging system
- [ ] Folders/collections support
- [ ] Scheduling capabilities
- [ ] Bulk operations for multiple links

---

## Development Principles

Throughout all development phases, we commit to:

1. **Maintaining Simplicity**: Keep the extension lightweight and focused on its core purpose.
2. **Performance First**: Ensure the extension remains fast and resource-efficient.
3. **Privacy By Design**: Never collect or transmit user data beyond what's explicitly configured.
4. **Accessibility**: Ensure the extension is usable by everyone.
5. **Open Development**: Keep the codebase open source and welcome community contributions.

## Feature Request Prioritization

Features and improvements are prioritized based on:

1. User impact and value
2. Technical feasibility
3. Alignment with core purpose
4. Maintenance considerations
5. Community interest

We welcome feature suggestions and contributions from the community via GitHub issues and pull requests.