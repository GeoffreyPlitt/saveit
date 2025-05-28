/**
 * SaveIt Options Page JavaScript
 */

// Cache DOM elements for performance
const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
  // Cache DOM elements
  ['webhookUrl', 'apiKey', 'optionsForm', 'testButton', 'status', 'webhookUrlValidation', 'apiKeyValidation']
    .forEach(id => elements[id] = document.getElementById(id));
  
  // Load settings
  await loadSettings();
  
  // Setup event listeners
  elements.optionsForm.addEventListener('submit', saveSettings);
  elements.testButton.addEventListener('click', testWebhook);
  elements.webhookUrl.addEventListener('input', () => validateInput('webhookUrl', validateUrl));
  elements.apiKey.addEventListener('input', () => validateInput('apiKey', validateToken));
});

/**
 * Load existing settings from storage
 */
async function loadSettings() {
  try {
    const { webhookUrl, apiKey } = await chrome.storage.sync.get(['webhookUrl', 'apiKey']);
    
    if (webhookUrl) {
      elements.webhookUrl.value = webhookUrl;
      validateInput('webhookUrl', validateUrl);
    }
    
    if (apiKey) {
      elements.apiKey.value = apiKey;
      validateInput('apiKey', validateToken);
    }
  } catch (error) {
    showStatus('Failed to load settings', 'error');
  }
}

/**
 * Save settings to storage
 */
async function saveSettings(event) {
  event.preventDefault();
  
  const webhookUrl = elements.webhookUrl.value.trim();
  const apiKey = elements.apiKey.value.trim();
  
  // Validate webhook URL
  if (!webhookUrl) {
    return showStatus('Webhook URL is required', 'error');
  }
  
  try {
    new URL(webhookUrl); // Validate URL format
  } catch (error) {
    return showStatus('Please enter a valid webhook URL', 'error');
  }
  
  try {
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
  const webhookUrl = elements.webhookUrl.value.trim();
  const apiKey = elements.apiKey.value.trim();
  
  if (!webhookUrl) {
    return showStatus('Please enter a webhook URL first', 'error');
  }
  
  // Validate URL format
  try {
    new URL(webhookUrl);
  } catch (error) {
    return showStatus('Please enter a valid webhook URL', 'error');
  }
  
  // Show loading state
  const originalText = elements.testButton.textContent;
  elements.testButton.textContent = 'Testing...';
  elements.testButton.disabled = true;
  
  try {
    // Test request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      },
      body: JSON.stringify({
        url: 'https://example.com/test',
        title: 'SaveIt Configuration Test',
        timestamp: Date.now()
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      await response.text();
      showStatus(`✅ Test successful! Status: ${response.status}`, 'success');
    } else {
      const errorText = await response.text();
      const errorMsg = errorText ? ` - ${errorText.substring(0, 100)}` : '';
      showStatus(`❌ Test failed: ${response.status} ${response.statusText}${errorMsg}`, 'error');
    }
  } catch (error) {
    const message = error.name === 'AbortError' ? 
      '❌ Test timed out (10 seconds)' : 
      `❌ Test failed: ${error.message}`;
    showStatus(message, 'error');
  } finally {
    // Restore button state
    elements.testButton.textContent = originalText;
    elements.testButton.disabled = false;
  }
}

/**
 * Validate input with given validator function
 */
function validateInput(fieldName, validatorFn) {
  const input = elements[fieldName];
  const validation = elements[`${fieldName}Validation`];
  const value = input.value.trim();
  
  if (!value) {
    input.className = '';
    validation.className = 'input-validation';
    return;
  }
  
  const result = validatorFn(value);
  input.className = result.valid ? 'valid' : 'invalid';
  validation.className = `input-validation show ${result.valid ? 'valid' : 'invalid'}`;
  validation.textContent = result.message;
}

/**
 * Validate URL
 */
function validateUrl(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'https:') {
      return { valid: true, message: '✅ Valid HTTPS webhook URL' };
    } else if (parsedUrl.protocol === 'http:') {
      return { valid: true, message: '⚠️ Valid HTTP URL (HTTPS recommended for security)' };
    }
    return { valid: false, message: '❌ Only HTTP/HTTPS URLs are supported' };
  } catch (error) {
    return { valid: false, message: '❌ Please enter a valid URL' };
  }
}

/**
 * Validate API token
 */
function validateToken(token) {
  if (token.length < 8) {
    return { valid: false, message: '⚠️ API key seems short (consider using a strong token)' };
  }
  return { valid: true, message: '✅ API key looks good' };
}

/**
 * Show status message
 */
function showStatus(message, type) {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
  elements.status.style.display = 'block';
  
  // Hide status after 5 seconds
  setTimeout(() => elements.status.style.display = 'none', 5000);
}