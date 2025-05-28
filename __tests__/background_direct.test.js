/**
 * Simplified tests for background.js to improve coverage
 * @jest-environment jsdom
 */

// Import Jest globals
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Import the actual functions from background.js
import '../background.js';

// Test the function bindings
describe('Background Service Worker Bindings', () => {
  // Check if functions are attached to global scope for Chrome extension context
  test('should attach sendToWebhook to window/self if window is defined', () => {
    // Check if we're in browser context
    if (typeof window !== 'undefined') {
      expect(typeof window.sendToWebhook).toBe('function');
      expect(typeof window.showSuccessNotification).toBe('function');
      expect(typeof window.showErrorNotification).toBe('function');
    } else if (typeof self !== 'undefined') {
      expect(typeof self.sendToWebhook).toBe('function');
      expect(typeof self.showSuccessNotification).toBe('function');
      expect(typeof self.showErrorNotification).toBe('function');
    } else {
      // Skip test if not in browser or worker context
      console.log('Not in browser or worker context, skipping binding test');
    }
  });
});