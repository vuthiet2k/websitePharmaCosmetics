const { test, expect } = require('@playwright/test');

// 2026-10-10: người dùng báo trang sản phẩm chưa có bài blog liên quan và sản phẩm liên quan lặp lại 2 lần.
const PDP = '/serum-vitamin-c-15';

test('trang SP: "Bài viết liên quan" ưu tiên bài gắn tag sanpham:<alias>', async ({ page }) => {
  await page.goto(PDP);
  const box = page.locator('[data-pdp-articles]');
  await expect(box).toBeVisible();
  await expect(box.locator('h2')).toHaveText('Bài viết liên quan');
  expect(Number(await box.getAttribute('data-pdp-articles-matched'))).toBeGreaterThan(0);
  await expect(box.locator('.pc-section-eyebrow')).toHaveText('Kiến thức chăm sóc da');
  await expect(box.locator('.pc-acard')).toHaveCount(3); // thiết kế luôn 3 thẻ: bài khớp trước, thiếu thì thêm bài mới nhất
  await expect(box.locator('.pc-acard__cat').first()).toHaveText('Làm sáng da'); // tag chude:<Nhãn>
  await expect(box.locator('.pc-acard__name').first()).toHaveText(/^Chuyên gia /); // tag chuyengia:<handle>
  const first = await box.locator('.pc-acard__title a').first().textContent();
  expect(first).toMatch(/Vitamin C/i); // bài gắn sanpham:serum-vitamin-c-15 đứng đầu
});

test('trang SP: "Có thể bạn thích" và "Sản phẩm liên quan" không lặp, không gợi ý chính SP đang xem', async ({ page }) => {
  await page.goto(PDP);
  const hrefs = await page.evaluate(() => {
    const pick = sel => [...document.querySelectorAll(sel)].map(a => a.getAttribute('href'));
    return {
      like: pick('.product-favorite .product-name a'),
      related: pick('.swiper_product_related .swiper-slide .product-name a'),
    };
  });
  expect(hrefs.like.length).toBeGreaterThan(0);
  expect(hrefs.related.length).toBeGreaterThan(0);
  const all = [...hrefs.like, ...hrefs.related];
  expect(new Set(all).size).toBe(all.length);
  expect(all).not.toContain(PDP);
});

test('trang chủ: 6 thẻ "Giải pháp" mở danh mục giai-phap-* (không về trang tìm kiếm)', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('.portal-concerns a.concern').evaluateAll(els => els.map(e => e.getAttribute('href')));
  expect(hrefs.length).toBe(6);
  for (const h of hrefs) expect(h).toMatch(/^\/giai-phap-/);
});
