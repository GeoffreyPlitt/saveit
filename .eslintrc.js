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
    // Strict rules as errors to enforce code quality
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'semi': ['error', 'always'],
    'no-unused-vars': ['error', { 
      'varsIgnorePattern': 'fetchWithRetry|getWebhookConfig|saveWebhookConfig|logError|getLastError',
      'argsIgnorePattern': 'responseText' 
    }],
    'no-console': ['error', { allow: ['error', 'warn'] }]
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