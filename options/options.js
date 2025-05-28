/**
 * SaveIt Options Page JavaScript
 * Handles webhook configuration and settings management
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Load existing settings
  await loadSettings();
  
  // Setup event listeners
  document.getElementById('optionsForm').addEventListener('submit', saveSettings);
  document.getElementById('testButton').addEventListener('click', testWebhook);
});

/**
 * Load existing settings from storage
 */
async function loadSettings() {
  try {
    const { webhookUrl, apiKey } = await chrome.storage.sync.get(['webhookUrl', 'apiKey']);
    
    if (webhookUrl) {
      document.getElementById('webhookUrl').value = webhookUrl;
    }
    
    if (apiKey) {
      document.getElementById('apiKey').value = apiKey;
    }
  } catch (error) {
    showStatus('Failed to load settings', 'error');
  }
}

/**
 * Save settings to storage
 * @param {Event} event - Form submit event
 */
async function saveSettings(event) {
  event.preventDefault();
  
  const webhookUrl = document.getElementById('webhookUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  
  // Validate webhook URL
  if (!webhookUrl) {
    showStatus('Webhook URL is required', 'error');
    return;
  }
  
  try {
    new URL(webhookUrl); // Validate URL format
  } catch (error) {
    showStatus('Please enter a valid webhook URL', 'error');
    return;
  }
  
  try {
    // Save to storage
    await chrome.storage.sync.set({ webhookUrl, apiKey });
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Failed to save settings', 'error');
  }
}

/**
 * Test webhook configuration
 */
async function testWebhook() {
  const webhookUrl = document.getElementById('webhookUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!webhookUrl) {
    showStatus('Please enter a webhook URL first', 'error');
    return;
  }
  
  // Show loading state
  const testButton = document.getElementById('testButton');
  const originalText = testButton.textContent;
  testButton.textContent = 'Testing...';
  testButton.disabled = true;
  
  try {
    // Prepare test payload
    const payload = {
      url: 'https://example.com/test',
      title: 'SaveIt Configuration Test',
      timestamp: Date.now()
    };
    
    // Prepare request options
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    };
    
    // Add authorization header if API key is provided
    if (apiKey) {
      options.headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Send test request
    const response = await fetch(webhookUrl, options);
    
    if (response.ok) {
      showStatus('Webhook test successful!', 'success');
    } else {
      showStatus(`Webhook test failed: ${response.status} ${response.statusText}`, 'error');
    }
    
  } catch (error) {
    showStatus(`Webhook test failed: ${error.message}`, 'error');
  } finally {
    // Restore button state
    testButton.textContent = originalText;
    testButton.disabled = false;
  }
}

/**
 * Show status message
 * @param {string} message - Status message
 * @param {string} type - Message type ('success' or 'error')
 */
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  // Hide status after 5 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}