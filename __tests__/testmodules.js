/**
 * Simple test script to check if modules are properly imported
 * @jest-environment jsdom
 */

// Import Jest globals
import { describe, test, expect } from '@jest/globals';

// Import utils
import { fetchWithRetry, getWebhookConfig } from '../utils.js';

// Import background
import { sendToWebhook, showSuccessNotification } from '../background.js';

// Simple test to check if imports are working
describe('Module imports', () => {
  test('utils.js functions are properly imported', () => {
    expect(typeof fetchWithRetry).toBe('function');
    expect(typeof getWebhookConfig).toBe('function');
  });

  test('background.js functions are properly imported', () => {
    expect(typeof sendToWebhook).toBe('function');
    expect(typeof showSuccessNotification).toBe('function');
  });
});