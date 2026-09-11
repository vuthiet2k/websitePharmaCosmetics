// tests/visual/homepage-blog.spec.js — REOPEN 2026-09-11 (Visual Regression Gate)
// Bao phủ các trang vừa thay đổi trong T-98 (ui-parity-fixes) + M7-M10 REOPEN, theo đúng yêu
// cầu "Mọi thay đổi UI bắt buộc phải vượt qua Visual Regression Testing". LẦN CHẠY ĐẦU TIÊN sẽ
// tạo baseline (chưa có gì để so sánh — không phải "PASSED regression", xem ghi chú evidence).
const { test, expect } = require('@playwright/test');

const PAGES = [
  { name: 'homepage', path: '/?tpl=index' },
  { name: 'blog-listing', path: '/?tpl=blog' },
  { name: 'article-detail', path: '/?tpl=article' },
  { name: 'clinical-proof', path: '/?tpl=page.clinical-proof' },
  { name: 'spa-services', path: '/?tpl=page.spa-services' },
  { name: 'b2b-distribution', path: '/?tpl=page.dai-ly-b2b' },
  { name: 'ingredient-lookup', path: '/?tpl=page.tra-cuu-hoat-chat' },
  { name: 'skinhealthy-home', path: '/?tpl=page.indexskinhealthy' },
];

for (const p of PAGES) {
  test(`visual: ${p.name}`, async ({ page }) => {
    await page.goto(p.path, { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot(`${p.name}.png`, { fullPage: true });
  });
}
