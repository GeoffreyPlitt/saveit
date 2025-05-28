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
    sourceType: 'module' // Changed from 'script' to 'module'
  },
  rules: {
    // Strict rules as errors to enforce code quality
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'semi': ['error', 'always'],
    'no-unused-vars': ['error', { 
      'argsIgnorePattern': 'responseText' 
    }],
    'no-console': ['error', { allow: ['error', 'warn'] }]
  },
  globals: {
    // Add globals that may not be detected by ESLint
    'importScripts': 'writable'
  }
};