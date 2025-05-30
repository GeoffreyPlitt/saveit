/**
 * SaveIt Notification Logic - Pure functions for business logic
 * These functions are easily testable as they don't depend on DOM or browser APIs
 */

/**
 * Parse notification parameters from URL search string
 * @param {string} searchString - URL search parameters (e.g., "?type=success&title=Test")
 * @returns {Object} Parsed notification configuration
 */
export function parseNotificationParams(searchString) {
  const params = new URLSearchParams(searchString);
  
  return {
    type: params.get('type') || 'success',
    title: params.get('title') || 'SaveIt',
    message: params.get('message') || '',
    autoClose: params.get('autoClose') !== 'false',
    duration: parseInt(params.get('duration') || '4000'),
    showConfigButton: params.get('showConfigButton') === 'true'
  };
}

/**
 * Get notification configuration based on type
 * @param {string} type - Notification type ('success', 'error', 'config-error')
 * @returns {Object} Configuration object
 */
export function getNotificationConfig(type) {
  const configs = {
    success: {
      iconClass: 'icon success',
      iconText: '✓',
      showButtons: false
    },
    error: {
      iconClass: 'icon error', 
      iconText: '✕',
      showButtons: true
    },
    'config-error': {
      iconClass: 'icon error',
      iconText: '⚠',
      showButtons: true
    }
  };
  
  return configs[type] || configs.success;
}

/**
 * Calculate remaining auto-close time based on progress
 * @param {number} originalDuration - Original duration in ms
 * @param {number} elapsedTime - Time already elapsed in ms
 * @returns {number} Remaining time in ms
 */
export function calculateRemainingTime(originalDuration, elapsedTime) {
  const remaining = originalDuration - elapsedTime;
  return Math.max(remaining, 0);
}

/**
 * Validate notification data
 * @param {Object} data - Notification data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateNotificationData(data) {
  const errors = [];
  
  if (!data) {
    errors.push('Notification data is required');
    return { isValid: false, errors };
  }
  
  if (data.type && !['success', 'error', 'config-error'].includes(data.type)) {
    errors.push(`Invalid notification type: ${data.type}`);
  }
  
  if (data.duration && (typeof data.duration !== 'number' || data.duration < 0)) {
    errors.push('Duration must be a positive number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate button configuration based on notification type and data
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 * @returns {Array} Array of button configurations
 */
export function getButtonConfig(type, data) {
  if (type === 'config-error' && data.showConfigButton) {
    return [
      { action: 'configure', text: 'Configure Extension', primary: true }
    ];
  }
  
  if (type === 'error') {
    return [
      { action: 'viewLog', text: 'View Log', primary: false },
      { action: 'retry', text: 'Retry', primary: true }
    ];
  }
  
  return [];
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  
  // Simple escape function that works in both browser and test environments
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate notification HTML content
 * @param {Object} config - Notification configuration
 * @param {Object} data - Notification data
 * @returns {string} HTML string
 */
export function generateNotificationHTML(config, data) {
  const buttons = getButtonConfig(data.type, data);
  
  let buttonsHtml = '';
  if (buttons.length > 0) {
    const buttonElements = buttons.map(btn => 
      `<button class="saveit-notification-btn ${btn.primary ? 'saveit-notification-btn-primary' : 'saveit-notification-btn-secondary'}" data-action="${btn.action}">
        ${escapeHtml(btn.text)}
      </button>`
    ).join('');
    
    buttonsHtml = `<div class="saveit-notification-buttons">${buttonElements}</div>`;
  }
  
  return `
    <button class="saveit-notification-close" data-action="close">&times;</button>
    
    <div class="saveit-notification-content">
      <div class="saveit-notification-icon ${config.iconClass}">
        ${config.iconText}
      </div>
      
      <div class="saveit-notification-text">
        <div class="saveit-notification-title">${escapeHtml(data.title || 'SaveIt')}</div>
        <div class="saveit-notification-message">${escapeHtml(data.message || '')}</div>
        ${buttonsHtml}
      </div>
    </div>

    ${data.autoClose !== false ? '<div class="saveit-notification-progress"></div>' : ''}
  `;
}

/**
 * Calculate auto-close animation configuration
 * @param {number} duration - Duration in milliseconds
 * @returns {Object} Animation configuration
 */
export function getAutoCloseAnimationConfig(duration) {
  return {
    initialWidth: '100%',
    finalWidth: '0%',
    transitionDuration: `${duration}ms`,
    animationDelay: 50 // Small delay before starting animation
  };
}

/**
 * Determine which event listeners should be attached based on notification type
 * @param {string} type - Notification type
 * @param {boolean} autoClose - Whether auto-close is enabled
 * @returns {Object} Event listener configuration
 */
export function getEventListenerConfig(type, autoClose) {
  const config = {
    closeButton: true,
    escapeKey: true,
    mouseEvents: autoClose, // Only attach mouse events if auto-close is enabled
    buttons: []
  };

  if (type === 'error') {
    config.buttons = ['viewLog', 'retry'];
  } else if (type === 'config-error') {
    config.buttons = ['configure'];
  }

  return config;
}

/**
 * Calculate resume timer duration after mouse leave
 * @param {number} originalDuration - Original auto-close duration
 * @param {number} elapsedTime - Time elapsed before pause
 * @param {number} defaultResumeTime - Default resume time if calculation fails
 * @returns {number} Resume duration in milliseconds
 */
export function calculateResumeTimer(originalDuration, elapsedTime, defaultResumeTime = 2000) {
  if (typeof originalDuration !== 'number' || typeof elapsedTime !== 'number') {
    return defaultResumeTime;
  }
  
  const remaining = originalDuration - elapsedTime;
  return remaining > 0 ? remaining : defaultResumeTime;
}

/**
 * Generate CSS animation keyframes for fade out effect
 * @param {Object} options - Animation options
 * @returns {string} CSS keyframes string
 */
export function generateFadeOutKeyframes(options = {}) {
  const {
    startOpacity = 1,
    endOpacity = 0,
    startTransform = 'translateY(0)',
    endTransform = 'translateY(-10px)'
  } = options;

  return `
    @keyframes fadeOut {
      from {
        opacity: ${startOpacity};
        transform: ${startTransform};
      }
      to {
        opacity: ${endOpacity};
        transform: ${endTransform};
      }
    }
  `;
}

/**
 * Determine the best window closing strategy
 * @param {number|null} windowId - Chrome window ID if available
 * @param {boolean} hasWindowsAPI - Whether chrome.windows API is available
 * @returns {Object} Closing strategy configuration
 */
export function getWindowClosingStrategy(windowId, hasWindowsAPI) {
  if (hasWindowsAPI && windowId) {
    return {
      method: 'chrome-api',
      windowId: windowId,
      fallback: 'window-close'
    };
  }
  
  return {
    method: 'window-close',
    windowId: null,
    fallback: null
  };
}

/**
 * Validate timer state for auto-close functionality
 * @param {Object} timerState - Current timer state
 * @returns {Object} Validation result
 */
export function validateTimerState(timerState) {
  const errors = [];
  
  if (!timerState) {
    errors.push('Timer state is required');
    return { isValid: false, errors };
  }
  
  if (timerState.duration !== undefined && (typeof timerState.duration !== 'number' || timerState.duration <= 0)) {
    errors.push('Duration must be a positive number');
  }
  
  if (timerState.startTime !== undefined && typeof timerState.startTime !== 'number') {
    errors.push('Start time must be a number');
  }
  
  if (timerState.isPaused !== undefined && typeof timerState.isPaused !== 'boolean') {
    errors.push('isPaused must be a boolean');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate elapsed time from timer state
 * @param {Object} timerState - Timer state with startTime and current time
 * @param {number} currentTime - Current timestamp
 * @returns {number} Elapsed time in milliseconds
 */
export function calculateElapsedTime(timerState, currentTime) {
  if (!timerState || !timerState.startTime || typeof currentTime !== 'number') {
    return 0;
  }
  
  return Math.max(currentTime - timerState.startTime, 0);
} 