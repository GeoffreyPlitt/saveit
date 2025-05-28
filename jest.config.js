export default {
  testEnvironment: 'jsdom',
  collectCoverage: true,
  coverageReporters: ['text', 'text-lcov', 'lcov'],
  coverageDirectory: 'coverage',
  moduleFileExtensions: ['js'],
  testMatch: ['**/__tests__/**/*.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000,
  transform: {},
  collectCoverageFrom: [
    'utils.js',
    'background.js',
    'popup/popup.js',
    'options/options.js'
  ]
};