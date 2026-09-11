// playwright.config.js — REOPEN 2026-09-11 (Visual Regression Gate, POLICY.yaml#visual_regression_gate)
// Pixel-based screenshot diff cho các trang khách hàng chính. Ngưỡng sai lệch 0.05%
// (maxDiffPixelRatio: 0.0005) theo đúng yêu cầu gate mới. Nhắm dev-server local (npm run preview)
// — KHÔNG chạy nhắm production thật.
// T-105 (2026-09-11): ENV_FAILURE thật phát hiện giữa phiên — "localhost" bắt đầu bị treo khi
// Chromium (Playwright) resolve DNS (curl vẫn resolve "localhost" bình thường, chỉ riêng
// Chromium's network stack bị treo, nghi IPv6 ::1 timeout trước khi fallback IPv4) — có thể liên
// quan sự kiện hệ thống thiếu bộ nhớ đã xảy ra giữa phiên. Đổi sang 127.0.0.1 (bỏ qua DNS resolve
// hoàn toàn) để loop test không phụ thuộc vào tình trạng DNS/network stack của máy.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/__snapshots__',
  timeout: 30000,
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.0005, animations: 'disabled' },
  },
  fullyParallel: false,
  retries: 0,
  reporter: [['html', { outputFolder: '.project-agent/evidence/visual/report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
