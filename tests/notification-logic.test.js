/**
 * Tests for notification-logic.js - Pure business logic functions
 */

import { describe, test, expect } from 'vitest';
import {
  parseNotificationParams,
  getNotificationConfig,
  calculateRemainingTime,
  validateNotificationData,
  getButtonConfig,
  escapeHtml,
  generateNotificationHTML,
  getAutoCloseAnimationConfig,
  getEventListenerConfig,
  calculateResumeTimer,
  generateFadeOutKeyframes,
  getWindowClosingStrategy,
  validateTimerState,
  calculateElapsedTime
} from '../notification/notification-logic.js';

describe('Notification Logic', () => {
  
  describe('parseNotificationParams', () => {
    test('should parse basic parameters', () => {
      const result = parseNotificationParams('?type=error&title=Test&message=Hello');
      expect(result).toEqual({
        type: 'error',
        title: 'Test',
        message: 'Hello',
        autoClose: true,
        duration: 4000,
        showConfigButton: false
      });
    });
    
    test('should use defaults for missing parameters', () => {
      const result = parseNotificationParams('');
      expect(result).toEqual({
        type: 'success',
        title: 'SaveIt',
        message: '',
        autoClose: true,
        duration: 4000,
        showConfigButton: false
      });
    });
    
    test('should handle autoClose=false', () => {
      const result = parseNotificationParams('?autoClose=false');
      expect(result.autoClose).toBe(false);
    });
    
    test('should parse duration as integer', () => {
      const result = parseNotificationParams('?duration=5000');
      expect(result.duration).toBe(5000);
    });
    
    test('should handle showConfigButton=true', () => {
      const result = parseNotificationParams('?showConfigButton=true');
      expect(result.showConfigButton).toBe(true);
    });
  });
  
  describe('getNotificationConfig', () => {
    test('should return success config', () => {
      const config = getNotificationConfig('success');
      expect(config).toEqual({
        iconClass: 'icon success',
        iconText: '✓',
        showButtons: false
      });
    });
    
    test('should return error config', () => {
      const config = getNotificationConfig('error');
      expect(config).toEqual({
        iconClass: 'icon error',
        iconText: '✕',
        showButtons: true
      });
    });
    
    test('should return config-error config', () => {
      const config = getNotificationConfig('config-error');
      expect(config).toEqual({
        iconClass: 'icon error',
        iconText: '⚠',
        showButtons: true
      });
    });
    
    test('should default to success for unknown type', () => {
      const config = getNotificationConfig('unknown');
      expect(config).toEqual({
        iconClass: 'icon success',
        iconText: '✓',
        showButtons: false
      });
    });
  });
  
  describe('calculateRemainingTime', () => {
    test('should calculate remaining time correctly', () => {
      expect(calculateRemainingTime(5000, 2000)).toBe(3000);
    });
    
    test('should return 0 for negative remaining time', () => {
      expect(calculateRemainingTime(2000, 5000)).toBe(0);
    });
    
    test('should handle exact match', () => {
      expect(calculateRemainingTime(3000, 3000)).toBe(0);
    });
    
    test('should handle zero elapsed time', () => {
      expect(calculateRemainingTime(5000, 0)).toBe(5000);
    });
    
    test('should handle zero duration', () => {
      expect(calculateRemainingTime(0, 0)).toBe(0);
    });
    
    test('should handle zero duration with elapsed time', () => {
      expect(calculateRemainingTime(0, 1000)).toBe(0);
    });
  });
  
  describe('validateNotificationData', () => {
    test('should validate correct data', () => {
      const data = { type: 'success', duration: 3000 };
      const result = validateNotificationData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
    
    test('should reject null data', () => {
      const result = validateNotificationData(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Notification data is required');
    });
    
    test('should reject invalid type', () => {
      const data = { type: 'invalid' };
      const result = validateNotificationData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid notification type: invalid');
    });
    
    test('should reject negative duration', () => {
      const data = { duration: -1000 };
      const result = validateNotificationData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duration must be a positive number');
    });
    
    test('should reject non-number duration', () => {
      const data = { duration: 'invalid' };
      const result = validateNotificationData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duration must be a positive number');
    });
    
    test('should allow valid types', () => {
      ['success', 'error', 'config-error'].forEach(type => {
        const result = validateNotificationData({ type });
        expect(result.isValid).toBe(true);
      });
    });
    
    test('should handle multiple errors', () => {
      const data = { type: 'invalid', duration: -1000 };
      const result = validateNotificationData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });
  
  describe('getButtonConfig', () => {
    test('should return config buttons for config-error with showConfigButton', () => {
      const buttons = getButtonConfig('config-error', { showConfigButton: true });
      expect(buttons).toEqual([
        { action: 'configure', text: 'Configure Extension', primary: true }
      ]);
    });
    
    test('should return error buttons for error type', () => {
      const buttons = getButtonConfig('error', {});
      expect(buttons).toEqual([
        { action: 'viewLog', text: 'View Log', primary: false },
        { action: 'retry', text: 'Retry', primary: true }
      ]);
    });
    
    test('should return empty array for success type', () => {
      const buttons = getButtonConfig('success', {});
      expect(buttons).toEqual([]);
    });
    
    test('should return empty array for config-error without showConfigButton', () => {
      const buttons = getButtonConfig('config-error', { showConfigButton: false });
      expect(buttons).toEqual([]);
    });
    
    test('should return empty array for config-error with undefined showConfigButton', () => {
      const buttons = getButtonConfig('config-error', {});
      expect(buttons).toEqual([]);
    });
    
    test('should return empty array for unknown type', () => {
      const buttons = getButtonConfig('unknown', {});
      expect(buttons).toEqual([]);
    });
    
    test('should handle null data', () => {
      const buttons = getButtonConfig('error', null);
      expect(buttons).toEqual([
        { action: 'viewLog', text: 'View Log', primary: false },
        { action: 'retry', text: 'Retry', primary: true }
      ]);
    });
    
    test('should handle undefined data', () => {
      const buttons = getButtonConfig('error', undefined);
      expect(buttons).toEqual([
        { action: 'viewLog', text: 'View Log', primary: false },
        { action: 'retry', text: 'Retry', primary: true }
      ]);
    });
    
    test('should handle data without showConfigButton property', () => {
      const buttons = getButtonConfig('config-error', { otherProp: true });
      expect(buttons).toEqual([]);
    });
  });
  
  describe('escapeHtml', () => {
    test('should escape basic HTML characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });
    
    test('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });
    
    test('should escape quotes', () => {
      expect(escapeHtml('He said "Hello" and \'Goodbye\'')).toBe('He said &quot;Hello&quot; and &#39;Goodbye&#39;');
    });
    
    test('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
    
    test('should handle non-string input', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(123)).toBe('');
      expect(escapeHtml({})).toBe('');
    });
    
    test('should handle string with no special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
    
    test('should handle multiple ampersands', () => {
      expect(escapeHtml('A & B & C')).toBe('A &amp; B &amp; C');
    });
    
    test('should handle mixed special characters', () => {
      expect(escapeHtml('<div class="test" data-value=\'123\'>A & B</div>')).toBe('&lt;div class=&quot;test&quot; data-value=&#39;123&#39;&gt;A &amp; B&lt;/div&gt;');
    });
    
    test('should handle already escaped content', () => {
      expect(escapeHtml('&lt;script&gt;')).toBe('&amp;lt;script&amp;gt;');
    });
    
    test('should handle unicode characters', () => {
      expect(escapeHtml('Hello 世界 <test>')).toBe('Hello 世界 &lt;test&gt;');
    });
  });
  
  describe('generateNotificationHTML', () => {
    test('should generate HTML for success notification', () => {
      const config = { iconClass: 'icon success', iconText: '✓' };
      const data = { type: 'success', title: 'Success', message: 'Done!', autoClose: true };
      
      const html = generateNotificationHTML(config, data);
      
      expect(html).toContain('saveit-notification-close');
      expect(html).toContain('icon success');
      expect(html).toContain('✓');
      expect(html).toContain('Success');
      expect(html).toContain('Done!');
      expect(html).toContain('saveit-notification-progress');
    });
    
    test('should generate HTML for error notification with buttons', () => {
      const config = { iconClass: 'icon error', iconText: '✕' };
      const data = { type: 'error', title: 'Error', message: 'Failed!', autoClose: false };
      
      const html = generateNotificationHTML(config, data);
      
      expect(html).toContain('saveit-notification-buttons');
      expect(html).toContain('View Log');
      expect(html).toContain('Retry');
      expect(html).not.toContain('saveit-notification-progress');
    });
    
    test('should handle missing title and message', () => {
      const config = { iconClass: 'icon', iconText: '!' };
      const data = { type: 'success' };
      
      const html = generateNotificationHTML(config, data);
      
      expect(html).toContain('SaveIt');
      expect(html).toContain('saveit-notification-message');
    });
    
    test('should escape HTML in title and message', () => {
      const config = { iconClass: 'icon', iconText: '!' };
      const data = { 
        type: 'success', 
        title: '<script>alert("xss")</script>', 
        message: 'Hello & Goodbye' 
      };
      
      const html = generateNotificationHTML(config, data);
      
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('Hello &amp; Goodbye');
    });
  });
  
  describe('getAutoCloseAnimationConfig', () => {
    test('should return correct animation config', () => {
      const config = getAutoCloseAnimationConfig(5000);
      expect(config).toEqual({
        initialWidth: '100%',
        finalWidth: '0%',
        transitionDuration: '5000ms',
        animationDelay: 50
      });
    });
    
    test('should handle zero duration', () => {
      const config = getAutoCloseAnimationConfig(0);
      expect(config.transitionDuration).toBe('0ms');
    });
    
    test('should handle large duration', () => {
      const config = getAutoCloseAnimationConfig(60000);
      expect(config.transitionDuration).toBe('60000ms');
    });
  });
  
  describe('getEventListenerConfig', () => {
    test('should return config for success with auto-close', () => {
      const config = getEventListenerConfig('success', true);
      expect(config).toEqual({
        closeButton: true,
        escapeKey: true,
        mouseEvents: true,
        buttons: []
      });
    });
    
    test('should return config for error type', () => {
      const config = getEventListenerConfig('error', false);
      expect(config).toEqual({
        closeButton: true,
        escapeKey: true,
        mouseEvents: false,
        buttons: ['viewLog', 'retry']
      });
    });
    
    test('should return config for config-error type', () => {
      const config = getEventListenerConfig('config-error', true);
      expect(config).toEqual({
        closeButton: true,
        escapeKey: true,
        mouseEvents: true,
        buttons: ['configure']
      });
    });
    
    test('should disable mouse events when auto-close is false', () => {
      const config = getEventListenerConfig('success', false);
      expect(config.mouseEvents).toBe(false);
    });
  });
  
  describe('calculateResumeTimer', () => {
    test('should calculate remaining time correctly', () => {
      const result = calculateResumeTimer(5000, 2000);
      expect(result).toBe(3000);
    });
    
    test('should return default when remaining time is negative', () => {
      const result = calculateResumeTimer(2000, 5000, 1500);
      expect(result).toBe(1500);
    });
    
    test('should return default for invalid inputs', () => {
      expect(calculateResumeTimer('invalid', 2000)).toBe(2000);
      expect(calculateResumeTimer(5000, 'invalid')).toBe(2000);
      expect(calculateResumeTimer(null, 2000)).toBe(2000);
    });
    
    test('should use custom default resume time', () => {
      const result = calculateResumeTimer('invalid', 2000, 3000);
      expect(result).toBe(3000);
    });
    
    test('should handle zero remaining time', () => {
      const result = calculateResumeTimer(3000, 3000, 1000);
      expect(result).toBe(1000);
    });
  });
  
  describe('generateFadeOutKeyframes', () => {
    test('should generate default keyframes', () => {
      const keyframes = generateFadeOutKeyframes();
      expect(keyframes).toContain('@keyframes fadeOut');
      expect(keyframes).toContain('opacity: 1');
      expect(keyframes).toContain('opacity: 0');
      expect(keyframes).toContain('translateY(0)');
      expect(keyframes).toContain('translateY(-10px)');
    });
    
    test('should use custom options', () => {
      const options = {
        startOpacity: 0.8,
        endOpacity: 0.2,
        startTransform: 'scale(1)',
        endTransform: 'scale(0.8)'
      };
      const keyframes = generateFadeOutKeyframes(options);
      expect(keyframes).toContain('opacity: 0.8');
      expect(keyframes).toContain('opacity: 0.2');
      expect(keyframes).toContain('scale(1)');
      expect(keyframes).toContain('scale(0.8)');
    });
    
    test('should handle partial options', () => {
      const keyframes = generateFadeOutKeyframes({ startOpacity: 0.5 });
      expect(keyframes).toContain('opacity: 0.5');
      expect(keyframes).toContain('opacity: 0');
      expect(keyframes).toContain('translateY(0)');
    });
  });
  
  describe('getWindowClosingStrategy', () => {
    test('should prefer chrome API when available', () => {
      const strategy = getWindowClosingStrategy(123, true);
      expect(strategy).toEqual({
        method: 'chrome-api',
        windowId: 123,
        fallback: 'window-close'
      });
    });
    
    test('should fallback to window.close when no API', () => {
      const strategy = getWindowClosingStrategy(123, false);
      expect(strategy).toEqual({
        method: 'window-close',
        windowId: null,
        fallback: null
      });
    });
    
    test('should fallback when no window ID', () => {
      const strategy = getWindowClosingStrategy(null, true);
      expect(strategy).toEqual({
        method: 'window-close',
        windowId: null,
        fallback: null
      });
    });
    
    test('should handle undefined window ID', () => {
      const strategy = getWindowClosingStrategy(undefined, true);
      expect(strategy).toEqual({
        method: 'window-close',
        windowId: null,
        fallback: null
      });
    });
  });
  
  describe('validateTimerState', () => {
    test('should validate correct timer state', () => {
      const state = { duration: 5000, startTime: 1234567890, isPaused: false };
      const result = validateTimerState(state);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
    
    test('should reject null state', () => {
      const result = validateTimerState(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timer state is required');
    });
    
    test('should reject invalid duration', () => {
      const state = { duration: -1000 };
      const result = validateTimerState(state);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duration must be a positive number');
    });
    
    test('should reject zero duration', () => {
      const state = { duration: 0 };
      const result = validateTimerState(state);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duration must be a positive number');
    });
    
    test('should reject non-number start time', () => {
      const state = { startTime: 'invalid' };
      const result = validateTimerState(state);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start time must be a number');
    });
    
    test('should reject non-boolean isPaused', () => {
      const state = { isPaused: 'invalid' };
      const result = validateTimerState(state);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('isPaused must be a boolean');
    });
    
    test('should handle multiple errors', () => {
      const state = { duration: -1000, startTime: 'invalid', isPaused: 'invalid' };
      const result = validateTimerState(state);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
    
    test('should allow missing optional fields', () => {
      const state = {};
      const result = validateTimerState(state);
      expect(result.isValid).toBe(true);
    });
  });
  
  describe('calculateElapsedTime', () => {
    test('should calculate elapsed time correctly', () => {
      const state = { startTime: 1000 };
      const result = calculateElapsedTime(state, 3000);
      expect(result).toBe(2000);
    });
    
    test('should return 0 for invalid state', () => {
      expect(calculateElapsedTime(null, 3000)).toBe(0);
      expect(calculateElapsedTime(undefined, 3000)).toBe(0);
      expect(calculateElapsedTime({}, 3000)).toBe(0);
    });
    
    test('should return 0 for invalid current time', () => {
      const state = { startTime: 1000 };
      expect(calculateElapsedTime(state, 'invalid')).toBe(0);
      expect(calculateElapsedTime(state, null)).toBe(0);
    });
    
    test('should return 0 for negative elapsed time', () => {
      const state = { startTime: 3000 };
      const result = calculateElapsedTime(state, 1000);
      expect(result).toBe(0);
    });
    
    test('should handle zero elapsed time', () => {
      const state = { startTime: 1000 };
      const result = calculateElapsedTime(state, 1000);
      expect(result).toBe(0);
    });
  });
}); 