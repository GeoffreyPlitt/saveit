/**
 * Tests for background.js functionality
 */

// Mock the importScripts function used in background.js
global.importScripts = jest.fn();

// Add additional mocks needed for background.js
chrome.contextMenus = {
  create: jest.fn(),
  onClicked: { addListener: jest.fn() }
};

chrome.action = {
  onClicked: { addListener: jest.fn() }
};

chrome.runtime.onInstalled = { addListener: jest.fn() };
chrome.runtime.onMessage = { addListener: jest.fn() };
chrome.notifications.onButtonClicked = { addListener: jest.fn() };
chrome.tabs = { create: jest.fn() };

// Import utility functions from setup.js to make them available
// This is usually done via importScripts in the actual extension
const fs = require('fs');
const path = require('path');

// Read the utils.js file content
const utilsPath = path.join(__dirname, '../utils.js');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');

// Evaluate utils.js to get the functions
eval(utilsContent);

// Now read and evaluate background.js
const backgroundPath = path.join(__dirname, '../background.js');
const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');

describe('Background Script', () => {
  // Before evaluating the background script for each test
  beforeEach(() => {
    // Reset action tracking variables
    global.sendToWebhook = undefined;
    global.showSuccessNotification = undefined;
    global.showErrorNotification = undefined;
    
    // Capture chrome API listeners
    const originalAddListener = chrome.action.onClicked.addListener;
    chrome.action.onClicked.addListener = jest.fn(callback => {
      chrome.action.onClicked.callback = callback;
      originalAddListener(callback);
    });
    
    const originalContextMenuAddListener = chrome.contextMenus.onClicked.addListener;
    chrome.contextMenus.onClicked.addListener = jest.fn(callback => {
      chrome.contextMenus.onClicked.callback = callback;
      originalContextMenuAddListener(callback);
    });
    
    const originalRuntimeMessageAddListener = chrome.runtime.onMessage.addListener;
    chrome.runtime.onMessage.addListener = jest.fn(callback => {
      chrome.runtime.onMessage.callback = callback;
      originalRuntimeMessageAddListener(callback);
    });

    // Reset fetch mock behavior
    fetch.mockReset();
    
    // Now evaluate background.js
    eval(backgroundContent);
  });

  test('should register context menu on installation', () => {
    // Trigger the onInstalled listener
    const callback = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    callback();
    
    // Verify context menu was created
    expect(chrome.contextMenus.create).toHaveBeenCalledWith({
      id: 'saveit-send',
      title: 'Send to Webhook',
      contexts: ['link', 'page']
    });
  });

  test('should send to webhook when toolbar icon is clicked', async () => {
    // Mock the sendToWebhook function
    global.sendToWebhook = jest.fn();
    
    // Simulate toolbar click
    const tab = { id: 1, url: 'https://example.com', title: 'Example Page' };
    await chrome.action.onClicked.callback(tab);
    
    // Verify sendToWebhook was called with correct args
    expect(sendToWebhook).toHaveBeenCalledWith('https://example.com', 'Example Page');
  });

  test('should send to webhook when context menu is clicked for a page', async () => {
    // Mock the sendToWebhook function
    global.sendToWebhook = jest.fn();
    
    // Simulate context menu click on a page
    const info = { menuItemId: 'saveit-send' };
    const tab = { id: 1, url: 'https://example.com', title: 'Example Page' };
    await chrome.contextMenus.onClicked.callback(info, tab);
    
    // Verify sendToWebhook was called with correct args
    expect(sendToWebhook).toHaveBeenCalledWith('https://example.com', 'Example Page');
  });

  test('should send to webhook when context menu is clicked for a link', async () => {
    // Mock the sendToWebhook function
    global.sendToWebhook = jest.fn();
    
    // Simulate context menu click on a link
    const info = { 
      menuItemId: 'saveit-send',
      linkUrl: 'https://example.com/link'
    };
    const tab = { id: 1, url: 'https://example.com', title: 'Example Page' };
    await chrome.contextMenus.onClicked.callback(info, tab);
    
    // Verify sendToWebhook was called with correct args
    expect(sendToWebhook).toHaveBeenCalledWith('https://example.com/link', 'Example Page');
  });

  test('should handle runtime message to send to webhook', async () => {
    // Mock the sendToWebhook function to return successfully
    global.sendToWebhook = jest.fn().mockResolvedValue(undefined);
    
    // Mock message request
    const request = {
      action: 'sendToWebhook',
      url: 'https://example.com',
      title: 'Example Page'
    };
    
    // Mock sendResponse function
    const sendResponse = jest.fn();
    
    // Call the message listener
    const returnValue = chrome.runtime.onMessage.callback(request, {}, sendResponse);
    
    // Verify the listener returns true (for async response)
    expect(returnValue).toBe(true);
    
    // Wait for the promise to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify sendToWebhook was called and sendResponse was called with success
    expect(sendToWebhook).toHaveBeenCalledWith('https://example.com', 'Example Page');
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('should open error page when notification button is clicked', async () => {
    // Trigger the notification button click listener
    const callback = chrome.notifications.onButtonClicked.addListener.mock.calls[0][0];
    await callback('saveit-error-12345', 0);
    
    // Verify error page was opened
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://mock-extension-id/error/error.html'
    });
  });
});