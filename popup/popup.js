/**
 * SaveIt Popup JavaScript
 * Handles popup interface interactions
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Setup event listeners
  document.getElementById('sendCurrentPage').addEventListener('click', sendCurrentPage);
  document.getElementById('openOptions').addEventListener('click', openOptions);
  
  // Check if webhook is configured
  await checkConfiguration();
});

/**
 * Send current page to webhook
 */
async function sendCurrentPage() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('Unable to get current tab', 'error');
      return;
    }
    
    // Check webhook configuration
    const { webhookUrl } = await chrome.storage.sync.get(['webhookUrl']);
    
    if (!webhookUrl) {
      showStatus('Please configure webhook first', 'warning');
      return;
    }
    
    // Show loading state
    const button = document.getElementById('sendCurrentPage');
    const originalText = button.textContent;
    button.textContent = 'Sending...';
    button.disabled = true;
    
    // Send message to background script to handle the webhook request
    chrome.runtime.sendMessage({
      action: 'sendToWebhook',
      url: tab.url,
      title: tab.title
    }, (response) => {
      // Restore button state
      button.textContent = originalText;
      button.disabled = false;
      
      if (response && response.success) {
        showStatus('Sent successfully!', 'success');
        // Close popup after successful send
        setTimeout(() => window.close(), 1000);
      } else {
        showStatus('Failed to send', 'error');
      }
    });
    
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    
    // Restore button state
    const button = document.getElementById('sendCurrentPage');
    button.textContent = 'Send Current Page';
    button.disabled = false;
  }
}

/**
 * Open options page
 */
function openOptions() {
  chrome.runtime.openOptionsPage();
  window.close();
}

/**
 * Check if webhook is configured and update UI accordingly
 */
async function checkConfiguration() {
  try {
    const { webhookUrl } = await chrome.storage.sync.get(['webhookUrl']);
    
    if (!webhookUrl) {
      showStatus('Webhook not configured', 'warning');
      document.getElementById('sendCurrentPage').disabled = true;
    }
  } catch (error) {
    showStatus('Unable to check configuration', 'error');
  }
}

/**
 * Show status message
 * @param {string} message - Status message
 * @param {string} type - Message type ('success', 'error', or 'warning')
 */
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  // Hide status after 3 seconds for popup
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
}