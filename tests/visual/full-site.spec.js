// tests/visual/full-site.spec.js — REOPEN 2026-09-11 (mở rộng Visual Regression Gate)
// Bao phủ toàn bộ trang còn lại chưa có trong homepage-blog.spec.js (đã cover 8 trang chính
// M7-M10). KHÔNG bao gồm các endpoint fragment/AJAX/JSON thuần (search.data*, product.favorite,
// product.viewed, collection.ajaxload*) — chụp ảnh JSON/fragment không phục vụ mục đích visual
// regression thật. Cùng ngưỡng 0.05% (playwright.config.js#maxDiffPixelRatio).
const { test, expect } = require('@playwright/test');

const CUSTOMER_PAGES = [
  { name: 'product-detail', path: '/?tpl=product' },
  { name: 'cart', path: '/?tpl=cart' },
  { name: 'search', path: '/?tpl=search' },
  { name: 'collection', path: '/?tpl=collection' },
  { name: 'collection-skinhealthy', path: '/?tpl=collection.skinhealthy' },
  { name: 'about-us', path: '/?tpl=page.about-us' },
  { name: 'booking', path: '/?tpl=page.dat_lich_tu_van' },
  { name: 'ai-skin-quiz', path: '/?tpl=page.ai-skin-quiz' },
  { name: 'ai-skin-quiz-results', path: '/?tpl=page.ai-skin-quiz-results' },
  { name: 'expert-list', path: '/?tpl=page.chuyen-gia' },
  { name: 'expert-detail', path: '/?tpl=page.chuyen-gia-detail' },
  { name: 'patient-portal', path: '/?tpl=page.patient-portal' },
  { name: 'loyalty', path: '/?tpl=page.loyalty' },
  { name: 'seo-directory', path: '/?tpl=page.seo-directory' },
  { name: 'order-lookup', path: '/?tpl=page.order-lookup' },
  { name: 'order-tracking', path: '/?tpl=page.order-tracking' },
  { name: 'payment', path: '/?tpl=page.payment' },
  { name: 'skinhealthy-services', path: '/?tpl=page.skinhealthy-services' },
  { name: 'skinhealthy-service-detail', path: '/?tpl=page.skinhealthy-service-detail' },
  { name: 'blog-instagram-feed', path: '/?tpl=blog.instagram-feed' },
];

const CUSTOMER_ACCOUNT_PAGES = [
  { name: 'account-login', path: '/?tpl=customers/login' },
  { name: 'account-register', path: '/?tpl=customers/register' },
  { name: 'account-home', path: '/?tpl=customers/account' },
  { name: 'account-addresses', path: '/?tpl=customers/addresses' },
  { name: 'account-change-password', path: '/?tpl=customers/change_password' },
  { name: 'account-reset-password', path: '/?tpl=customers/reset_password' },
  { name: 'account-orders', path: '/?tpl=customers/orders' },
  { name: 'account-order-detail', path: '/?tpl=customers/order' },
];

const SYSTEM_PAGES = [
  { name: '404', path: '/?tpl=404' },
  { name: 'password-gate', path: '/?tpl=password' },
];

// mops-admin dùng layout/token system RIÊNG (ma-* atoms, ngoài phạm vi palette T-70) — tách
// project Playwright riêng để không lẫn viewport/threshold với theme khách hàng nếu sau này cần
// tinh chỉnh khác nhau; hiện dùng chung cấu hình mặc định.
const ADMIN_PAGES = [
  { name: 'mops-admin', path: '/?tpl=page.mops-admin' },
];

for (const p of [...CUSTOMER_PAGES, ...CUSTOMER_ACCOUNT_PAGES, ...SYSTEM_PAGES, ...ADMIN_PAGES]) {
  test(`visual: ${p.name}`, async ({ page }) => {
    await page.goto(p.path, { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot(`${p.name}.png`, { fullPage: true });
  });
}
