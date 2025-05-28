# Chrome Web Store Publication Guide

This document outlines the steps and requirements for publishing the SaveIt Chrome Extension to the Chrome Web Store.

## Pre-Publication Checklist

### 1. Technical Requirements

- [x] Extension uses Manifest V3 format
- [x] Extension follows Chrome Web Store policies
- [x] Extension passes all automated tests
- [x] Extension has been manually tested in Chrome
- [ ] Extension has been tested in Chrome Canary/Beta
- [ ] Extension has been tested on different operating systems

### 2. Required Assets

#### Extension ZIP File
- [ ] Create a ZIP file of the extension directory (excluding development files)
- [ ] Verify the ZIP includes all necessary files and no unnecessary files
- [ ] Keep the ZIP file below 10MB

#### Store Listing Assets
- [ ] Icon (128x128 PNG)
- [ ] Screenshots (1280x800 or 640x400 PNG/JPEG)
- [ ] Promotional images (optional):
  - [ ] Small promo tile (440x280 PNG/JPEG)
  - [ ] Large promo tile (920x680 PNG/JPEG)
  - [ ] Marquee promo tile (1400x560 PNG/JPEG)

### 3. Store Listing Content

#### Basic Information
- [ ] Extension name: "SaveIt - Webhook URL Saver"
- [ ] Short description (up to 132 characters):
  ```
  Save web pages and links to your webhook service with a single click. Send URLs with title and timestamp data.
  ```
- [ ] Detailed description (up to 16,000 characters), including:
  - Feature list
  - Use cases
  - Setup instructions
  - Support information

#### Categories
- [ ] Primary category: Productivity
- [ ] Secondary category: Developer Tools

#### Languages
- [ ] English (default)
- [ ] Consider additional languages if appropriate

### 4. Legal Requirements

- [ ] Privacy policy URL
- [ ] Terms of service URL (optional)
- [ ] Verify compliance with Chrome Web Store Developer Agreement
- [ ] Verify compliance with data privacy requirements (GDPR, CCPA, etc.)

## Publication Process

1. **Create Developer Account**
   - [ ] Register for a Google Developer account if not already done
   - [ ] Pay one-time developer registration fee ($5)

2. **Upload Extension**
   - [ ] Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - [ ] Click "New Item" and upload the ZIP file
   - [ ] Fill in all required information
   - [ ] Upload all required assets

3. **Submit for Review**
   - [ ] Preview the store listing
   - [ ] Submit the extension for review
   - [ ] Be prepared to wait 1-3 days for the review process

4. **Post-Publication Tasks**
   - [ ] Update the GitHub repository with the Chrome Web Store link
   - [ ] Update documentation with installation instructions
   - [ ] Monitor user feedback and reviews
   - [ ] Set up analytics to track installations (optional)

## Publication Timeline

| Task | Estimated Time | Deadline |
|------|----------------|----------|
| Prepare store assets | 1 week | TBD |
| Create privacy policy | 1 day | TBD |
| Final testing | 2 days | TBD |
| Store submission | 1 day | TBD |
| Review process | 1-3 days | N/A |
| Address feedback if needed | 1-3 days | N/A |
| Public launch | 1 day | TBD |

## Post-Launch Monitoring

- Set up a system to monitor:
  - User reviews and ratings
  - Support requests
  - Bug reports
  - Feature requests
  - Installation metrics

- Plan for regular updates based on user feedback and the roadmap in [ROADMAP.md](./ROADMAP.md)

---

## Resources

- [Chrome Web Store Developer Documentation](https://developer.chrome.com/docs/webstore/)
- [Chrome Extension Quality Guidelines](https://developer.chrome.com/docs/webstore/best_practices/)
- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program_policies/)
- [Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/intro/)