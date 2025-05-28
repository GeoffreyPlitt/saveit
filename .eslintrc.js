/* eslint-env node */
module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
    jest: true,
    node: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'script'
  },
  rules: {
    // Relaxed rules for testing environment
    'indent': 'off',
    'linebreak-style': 'off',
    'quotes': 'off',
    'semi': 'off',
    'no-unused-vars': 'off',
    'no-console': 'off'
  },
  globals: {
    // Add globals from utils.js that are used in other files
    'fetchWithRetry': 'writable',
    'getWebhookConfig': 'writable',
    'saveWebhookConfig': 'writable',
    'logError': 'writable',
    'getLastError': 'writable',
    'sendToWebhook': 'writable',
    'importScripts': 'writable'
  }
};