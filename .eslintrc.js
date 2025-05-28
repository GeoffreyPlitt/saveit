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
    // Restored stricter rules with warnings instead of errors to maintain compatibility
    'indent': ['warn', 2],
    'linebreak-style': ['warn', 'unix'],
    'quotes': ['warn', 'single', { 'avoidEscape': true }],
    'semi': ['warn', 'always'],
    'no-unused-vars': ['warn'],
    'no-console': ['warn', { allow: ['error', 'warn'] }]
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