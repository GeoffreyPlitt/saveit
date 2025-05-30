/**
 * SaveIt Notification Popup JavaScript
 */

let autoCloseTimer;
let currentWindowId;

document.addEventListener('DOMContentLoaded', async () => {
  // Get notification data from URL parameters
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type') || 'success';
  const title = params.get('title') || 'SaveIt';
  const message = params.get('message') || '';
  const autoClose = params.get('autoClose') !== 'false';
  const duration = parseInt(params.get('duration') || '4000');

  // Setup notification
  setupNotification(type, title, message, autoClose, duration);
  
  // Setup event listeners
  setupEventListeners();
  
  // Get current window ID for closing
  try {
    const window = await chrome.windows.getCurrent();
    currentWindowId = window.id;
  } catch (error) {
    console.error('Failed to get window ID:', error);
  }
});

/**
 * Setup the notification display
 */
function setupNotification(type, title, message, autoClose, duration) {
  const icon = document.getElementById('icon');
  const iconText = document.getElementById('iconText');
  const titleEl = document.getElementById('title');
  const messageEl = document.getElementById('message');
  const buttonsEl = document.getElementById('buttons');
  const autoCloseBar = document.getElementById('autoCloseBar');

  // Set content
  titleEl.textContent = title;
  messageEl.textContent = message;

  // Configure based on type
  if (type === 'success') {
    icon.className = 'icon success';
    iconText.textContent = '✓';
    buttonsEl.style.display = 'none';
  } else if (type === 'error') {
    icon.className = 'icon error';
    iconText.textContent = '✕';
    buttonsEl.style.display = 'flex';
  }

  // Setup auto-close
  if (autoClose) {
    setupAutoClose(duration, autoCloseBar);
  } else {
    autoCloseBar.style.display = 'none';
  }
}

/**
 * Setup auto-close functionality
 */
function setupAutoClose(duration, autoCloseBar) {
  // Animate the progress bar
  autoCloseBar.style.width = '100%';
  autoCloseBar.style.transitionDuration = `${duration}ms`;
  
  // Start the animation
  setTimeout(() => {
    autoCloseBar.style.width = '0%';
  }, 50);

  // Close after duration
  autoCloseTimer = setTimeout(() => {
    closeNotification();
  }, duration);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Close button
  document.getElementById('closeBtn').addEventListener('click', closeNotification);

  // View Log button
  document.getElementById('viewLogBtn').addEventListener('click', async () => {
    try {
      // Send message to background script to show stack trace
      await chrome.runtime.sendMessage({ action: 'showStackTrace' });
    } catch (error) {
      console.error('Failed to show stack trace:', error);
    }
  });

  // Retry button
  document.getElementById('retryBtn').addEventListener('click', async () => {
    try {
      // Send message to background script to retry
      await chrome.runtime.sendMessage({ action: 'retryLastRequest' });
      closeNotification();
    } catch (error) {
      console.error('Failed to retry request:', error);
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNotification();
    }
  });

  // Pause auto-close on hover
  document.body.addEventListener('mouseenter', () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      const autoCloseBar = document.getElementById('autoCloseBar');
      autoCloseBar.style.animationPlayState = 'paused';
    }
  });

  // Resume auto-close on mouse leave
  document.body.addEventListener('mouseleave', () => {
    const params = new URLSearchParams(window.location.search);
    const autoClose = params.get('autoClose') !== 'false';
    
    if (autoClose) {
      const autoCloseBar = document.getElementById('autoCloseBar');
      autoCloseBar.style.animationPlayState = 'running';
      
      // Resume with remaining time (simplified - just use 2 seconds)
      autoCloseTimer = setTimeout(() => {
        closeNotification();
      }, 2000);
    }
  });
}

/**
 * Close the notification popup
 */
function closeNotification() {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
  }
  
  // Add fade out animation
  document.body.style.animation = 'fadeOut 0.2s ease-in';
  
  setTimeout(() => {
    if (currentWindowId) {
      chrome.windows.remove(currentWindowId).catch(() => {
        // Fallback: close the window
        window.close();
      });
    } else {
      window.close();
    }
  }, 200);
}

// Add fade out animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
`;
document.head.appendChild(style); 