/**
 * SaveIt Popup JavaScript
 */

// Cache DOM elements
const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
  // Cache DOM elements
  ['sendCurrentPage', 'openOptions', 'status'].forEach(id => 
    elements[id] = document.getElementById(id));
  
  // Setup event listeners
  elements.sendCurrentPage.addEventListener('click', sendCurrentPage);
  elements.openOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
  
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
    if (!tab) return showStatus('Unable to get current tab', 'error');
    
    // Check webhook configuration
    const { webhookUrl } = await chrome.storage.sync.get(['webhookUrl']);
    if (!webhookUrl) return showStatus('Please configure webhook first', 'warning');
    
    // Show loading state
    setButtonState(true, 'Sending...');
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'sendToWebhook',
      url: tab.url,
      title: tab.title
    }, handleResponse);
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    setButtonState(false);
  }
}

/**
 * Handle response from background script
 */
function handleResponse(response) {
  setButtonState(false);
  
  if (response && response.success) {
    showStatus('Sent successfully!', 'success');
    setTimeout(() => window.close(), 1000);
  } else {
    showStatus('Failed to send', 'error');
  }
}

/**
 * Set button state (loading/normal)
 */
function setButtonState(loading, loadingText = 'Sending...') {
  const button = elements.sendCurrentPage;
  button.textContent = loading ? loadingText : 'Send Current Page';
  button.disabled = loading;
}

/**
 * Check if webhook is configured
 */
async function checkConfiguration() {
  try {
    const { webhookUrl } = await chrome.storage.sync.get(['webhookUrl']);
    if (!webhookUrl) {
      showStatus('Webhook not configured', 'warning');
      elements.sendCurrentPage.disabled = true;
    }
  } catch (error) {
    showStatus('Unable to check configuration', 'error');
  }
}

/**
 * Show status message
 */
function showStatus(message, type) {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
  elements.status.style.display = 'block';
  
  // Hide status after 3 seconds
  setTimeout(() => elements.status.style.display = 'none', 3000);
}