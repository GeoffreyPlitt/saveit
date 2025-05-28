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
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'semi': ['error', 'always'],
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
    'global': 'writable',
    'module': 'writable'
  }
};