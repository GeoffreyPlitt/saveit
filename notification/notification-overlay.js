/**
 * SaveIt Notification Overlay Content Script
 * This script runs on all web pages and shows notification overlays
 */

// Namespace to avoid conflicts with page scripts
const SaveItNotifications = {
  overlay: null,
  notifications: new Map(),
  nextId: 1,

  /**
   * Initialize the notification system
   */
  init() {
    try {
      // eslint-disable-next-line no-console
      console.log('SaveIt: Initializing notification overlay');
      
      // Create overlay container if it doesn't exist
      if (!this.overlay) {
        this.overlay = document.createElement('div');
        this.overlay.className = 'saveit-notification-overlay';
        document.body.appendChild(this.overlay);
        // eslint-disable-next-line no-console
        console.log('SaveIt: Overlay container created');
      }

      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // eslint-disable-next-line no-console
        console.log('SaveIt: Received message:', message);
        
        if (message.action === 'showNotification') {
          try {
            this.showNotification(message.data);
            sendResponse({ success: true });
            // eslint-disable-next-line no-console
            console.log('SaveIt: Notification shown successfully');
          } catch (error) {
            console.error('SaveIt: Error showing notification:', error);
            sendResponse({ success: false, error: error.message });
          }
        }
        return true;
      });
      
      // eslint-disable-next-line no-console
      console.log('SaveIt: Message listener registered');
    } catch (error) {
      console.error('SaveIt: Error initializing notification system:', error);
    }
  },

  /**
   * Show a notification
   * @param {Object} data - Notification data
   */
  showNotification(data) {
    const id = this.nextId++;
    const notification = this.createNotificationElement(id, data);
    
    this.overlay.appendChild(notification);
    this.notifications.set(id, notification);

    // Trigger animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Auto-hide for success notifications
    if (data.type === 'success' && data.autoClose !== false) {
      const duration = data.duration || 3000;
      this.setupAutoClose(id, duration);
    }

    return id;
  },

  /**
   * Create notification DOM element
   * @param {number} id - Notification ID
   * @param {Object} data - Notification data
   */
  createNotificationElement(id, data) {
    const notification = document.createElement('div');
    notification.className = 'saveit-notification';
    notification.dataset.id = id;

    const isError = data.type === 'error';
    const isConfigError = data.type === 'config-error';
    const isErrorType = isError || isConfigError;
    const iconText = isErrorType ? '⚠' : '✓';
    const iconClass = isErrorType ? 'error' : 'success';

    // Different button sets based on notification type
    let buttonsHtml = '';
    if (isConfigError && data.showConfigButton) {
      buttonsHtml = `
        <div class="saveit-notification-buttons">
          <button class="saveit-notification-btn saveit-notification-btn-primary" data-action="configure">
            Configure Extension
          </button>
        </div>
      `;
    } else if (isError) {
      buttonsHtml = `
        <div class="saveit-notification-buttons">
          <button class="saveit-notification-btn saveit-notification-btn-secondary" data-action="viewLog">
            View Log
          </button>
          <button class="saveit-notification-btn saveit-notification-btn-primary" data-action="retry">
            Retry
          </button>
        </div>
      `;
    }

    notification.innerHTML = `
      <button class="saveit-notification-close" data-action="close">&times;</button>
      
      <div class="saveit-notification-content">
        <div class="saveit-notification-icon ${iconClass}">
          ${iconText}
        </div>
        
        <div class="saveit-notification-text">
          <div class="saveit-notification-title">${this.escapeHtml(data.title || 'SaveIt')}</div>
          <div class="saveit-notification-message">${this.escapeHtml(data.message || '')}</div>
          ${buttonsHtml}
        </div>
      </div>

      ${data.autoClose !== false ? '<div class="saveit-notification-progress"></div>' : ''}
    `;

    // Add event listeners
    notification.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleAction(id, action);
      }
    });

    return notification;
  },

  /**
   * Setup auto-close for notifications
   * @param {number} id - Notification ID
   * @param {number} duration - Duration in milliseconds
   */
  setupAutoClose(id, duration) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    const progressBar = notification.querySelector('.saveit-notification-progress');
    if (progressBar) {
      // Animate progress bar
      progressBar.style.width = '100%';
      progressBar.style.transitionDuration = `${duration}ms`;
      
      setTimeout(() => {
        progressBar.style.width = '0%';
      }, 50);
    }

    // Auto-close after duration
    setTimeout(() => {
      this.hideNotification(id);
    }, duration);
  },

  /**
   * Handle button actions
   * @param {number} id - Notification ID
   * @param {string} action - Action type
   */
  handleAction(id, action) {
    switch (action) {
    case 'close':
      this.hideNotification(id);
      break;
      
    case 'configure':
      // Open extension options page
      chrome.runtime.sendMessage({ action: 'openOptions' });
      this.hideNotification(id);
      break;
      
    case 'viewLog':
      // Send message to background script
      chrome.runtime.sendMessage({ action: 'showStackTrace' });
      break;
      
    case 'retry':
      // Send message to background script
      chrome.runtime.sendMessage({ action: 'retryLastRequest' });
      this.hideNotification(id);
      break;
    }
  },

  /**
   * Hide a notification
   * @param {number} id - Notification ID
   */
  hideNotification(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.classList.remove('show');
    notification.classList.add('hide');

    // Remove from DOM after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SaveItNotifications.init());
} else {
  SaveItNotifications.init();
} 