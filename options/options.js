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
  
  // Setup real-time validation
  document.getElementById('webhookUrl').addEventListener('input', validateWebhookUrl);
  document.getElementById('apiKey').addEventListener('input', validateApiKey);
});

/**
 * Load existing settings from storage
 */
async function loadSettings() {
  try {
    const { webhookUrl, apiKey } = await chrome.storage.sync.get(['webhookUrl', 'apiKey']);
    
    if (webhookUrl) {
      document.getElementById('webhookUrl').value = webhookUrl;
      validateWebhookUrl(); // Trigger validation
    }
    
    if (apiKey) {
      document.getElementById('apiKey').value = apiKey;
      validateApiKey(); // Trigger validation
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
  
  // Validate URL format
  try {
    new URL(webhookUrl);
  } catch (error) {
    showStatus('Please enter a valid webhook URL', 'error');
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
    
    // Send test request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(webhookUrl, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const responseText = await response.text();
      showStatus(`✅ Webhook test successful! Status: ${response.status}`, 'success');
    } else {
      const responseText = await response.text();
      showStatus(`❌ Webhook test failed: ${response.status} ${response.statusText}${responseText ? ` - ${responseText.substring(0, 100)}` : ''}`, 'error');
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      showStatus('❌ Webhook test timed out (10 seconds)', 'error');
    } else {
      showStatus(`❌ Webhook test failed: ${error.message}`, 'error');
    }
  } finally {
    // Restore button state
    testButton.textContent = originalText;
    testButton.disabled = false;
  }
}

/**
 * Validate webhook URL in real-time
 */
function validateWebhookUrl() {
  const input = document.getElementById('webhookUrl');
  const validation = document.getElementById('webhookUrlValidation');
  const value = input.value.trim();
  
  if (!value) {
    input.className = '';
    validation.className = 'input-validation';
    return;
  }
  
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') {
      input.className = 'valid';
      validation.className = 'input-validation show valid';
      validation.textContent = '✅ Valid HTTPS webhook URL';
    } else if (url.protocol === 'http:') {
      input.className = 'valid';
      validation.className = 'input-validation show valid';
      validation.textContent = '⚠️ Valid HTTP URL (HTTPS recommended for security)';
    } else {
      input.className = 'invalid';
      validation.className = 'input-validation show invalid';
      validation.textContent = '❌ Only HTTP/HTTPS URLs are supported';
    }
  } catch (error) {
    input.className = 'invalid';
    validation.className = 'input-validation show invalid';
    validation.textContent = '❌ Please enter a valid URL';
  }
}

/**
 * Validate API key in real-time
 */
function validateApiKey() {
  const input = document.getElementById('apiKey');
  const validation = document.getElementById('apiKeyValidation');
  const value = input.value.trim();
  
  if (!value) {
    input.className = '';
    validation.className = 'input-validation';
    return;
  }
  
  if (value.length < 8) {
    input.className = 'invalid';
    validation.className = 'input-validation show invalid';
    validation.textContent = '⚠️ API key seems short (consider using a strong token)';
  } else {
    input.className = 'valid';
    validation.className = 'input-validation show valid';
    validation.textContent = '✅ API key looks good';
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