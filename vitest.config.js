import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['**/tests/**/*.js'],
    timeout: 10000,
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-lcov', 'lcov', 'cobertura', 'json-summary'],
      reportsDirectory: './coverage',
      clean: false,
      include: [
        'src/utils.js',
        'src/background.js',
        'options/options.js',
        'notification/notification.js',
        'notification/notification-overlay.js',
        'notification/notification-logic.js'
      ],
      exclude: [
        'notification/notification.js',
        'notification/notification-overlay.js'
      ]
    }
  }
}); 