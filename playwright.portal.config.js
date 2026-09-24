const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/portal',
  timeout: 45000,
  expect: { timeout: 10000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node dev-server.js',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
