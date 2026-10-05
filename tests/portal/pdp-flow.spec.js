const { test, expect } = require('@playwright/test');

// 2026-10-05 (PDP V3 — PRD "Tinh giản trang sản phẩm"): 2 phễu trên trang chi tiết.
// Fixture ở data/products.js: serum-vitamin-c-15 (thường, tag shopee_ có dấu "_"),
// kem-chong-nang-mineral-spf50 (thường, không Shopee), altreno-lotion-0-05-tretinoin (tag loai:ke-toa).

async function productJsonLd(page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map(text => JSON.parse(text)).find(data => data['@type'] === 'Product');
}

test('Sản phẩm thường: form mua + Shopee đúng URL, không còn chia sẻ/yêu thích/lượt xem', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/serum-vitamin-c-15');

  await expect(page.locator('#add-to-cart-form')).toHaveCount(1);
  await expect(page.locator('.details-pro .btn-buyNow')).toBeVisible();
  await expect(page.locator('.boz-form .mua_shop a')).toHaveAttribute('href', 'https://shopee.vn/Serum_Vitamin_C_15-i.123456.789');
  await expect(page.locator('.social-media, .product-wish, .abps-productdetail')).toHaveCount(0);
  await expect(page.locator('.pc-rx-consult')).toHaveCount(0);

  const ld = await productJsonLd(page);
  expect(ld.offers && ld.offers['@type']).toBe('Offer');
  expect(errors).toEqual([]);
});

test('Sản phẩm thường không có tag shopee_ thì ẩn nút Shopee', async ({ page }) => {
  await page.goto('/kem-chong-nang-mineral-spf50');
  await expect(page.locator('#add-to-cart-form')).toHaveCount(1);
  await expect(page.locator('.mua_shop')).toHaveCount(0);
});

test('Sản phẩm kê toa: không form/giá/số lượng/Shopee/đánh giá, có cảnh báo + CTA Zalo', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/altreno-lotion-0-05-tretinoin');

  await expect(page.locator('form[action="/cart/add"]#add-to-cart-form')).toHaveCount(0);
  await expect(page.locator('section.layout-product .details-pro .product-price, #qtym, section.layout-product .btn-buyNow, .mua_shop')).toHaveCount(0);
  await expect(page.locator('.product-review, #tab-3, [data-tab="#tab-3"]')).toHaveCount(0);
  await expect(page.locator('.pc-rx-consult__title')).toHaveText(/SẢN PHẨM KÊ TOA/);
  await expect(page.locator('.pc-rx-consult__cta')).toHaveAttribute('href', /^https:\/\/zalo\.me\/\d+$/);
  await expect(page.locator('meta[property="og:price:amount"]')).toHaveCount(0);

  const ld = await productJsonLd(page);
  expect(ld.offers).toBeUndefined();
  expect(ld.aggregateRating).toBeUndefined();
  expect(errors).toEqual([]);
});

test('Thẻ danh mục của sản phẩm kê toa: không giá, không Xem nhanh/Thêm giỏ', async ({ page }) => {
  await page.goto('/collections/all');
  const card = page.locator('form.product-action').filter({ has: page.locator('a[href="/altreno-lotion-0-05-tretinoin"]') }).first();
  await expect(card).toHaveCount(1);
  await expect(card.locator('.pc-price--rx')).toBeVisible();
  await expect(card.locator('.quick-view, .add_to_cart')).toHaveCount(0);
  await expect(card).not.toContainText('1.250.000');
});

// 2026-10-05 (PRD mục 3/5/10 — người dùng chốt phương án 1 cho cả 3 hạng mục).
test('Đầu trang 2 cột, không còn khối cửa hàng; khối niềm tin + thương hiệu/xuất xứ; nhãn Shopee Mall', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/serum-vitamin-c-15');

  await expect(page.locator('.box_info_right, .product-policises-wrapper')).toHaveCount(0);
  const left = await page.locator('.product-detail-left').boundingBox();
  const right = await page.locator('section.layout-product .details-pro').first().boundingBox();
  expect(Math.abs(left.width - right.width)).toBeLessThan(4);
  expect(right.x).toBeGreaterThan(left.x + left.width - 4);

  const trust = page.locator('[data-pdp-trust]');
  await expect(trust.locator('.pc-pdp-trust__item')).toHaveCount(3);
  await expect(trust.locator('.pc-pdp-trust__origin')).toContainText('THƯƠNG HIỆU: PHARMA COSMETICS');
  await expect(trust.locator('.pc-pdp-trust__origin')).toContainText('XUẤT XỨ: VIỆT NAM');
  await expect(page.locator('.boz-form .mua_shop a')).toContainText('ĐẶT HÀNG TẠI SHOPEE MALL');
  await expect(page.locator('section.layout-product .details-product')).not.toContainText('xuatxu');
});

test('Tab chi tiết tách theo <h2>, bỏ mục rỗng; không có <h2> thì giữ 1 tab cũ', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/serum-vitamin-c-15');
  const links = page.locator('.product-tab .tabs-title .tab-link h3');
  await expect(links.first()).toHaveText('Thông tin sản phẩm');
  const titles = await links.allTextContents();
  expect(titles.slice(0, 3)).toEqual(['Thông tin sản phẩm', 'Thành phần', 'Hướng dẫn sử dụng']);
  expect(titles).not.toContain('Lưu ý');
  await expect(page.locator('#tab-c1')).toContainText('Đoạn mở đầu.');
  await expect(page.locator('#tab-c1')).toBeVisible();
  await page.locator('.tab-link[data-tab="#tab-c2"]').click();
  await expect(page.locator('#tab-c2')).toContainText('Vitamin C, Niacinamide.');
  await expect(page.locator('#tab-c1 .ba-text-fpt')).toBeHidden();
  expect(errors).toEqual([]);

  await page.goto('/kem-chong-nang-mineral-spf50');
  await expect(page.locator('#tab-1')).toHaveCount(1);
  await expect(page.locator('[id^="tab-c"]')).toHaveCount(0);
});

test('Kê toa: khối niềm tin chỉ còn dòng thương hiệu, không có cam kết giao hàng', async ({ page }) => {
  await page.goto('/altreno-lotion-0-05-tretinoin');
  await expect(page.locator('[data-pdp-trust] .pc-pdp-trust__item')).toHaveCount(0);
  await expect(page.locator('[data-pdp-trust] .pc-pdp-trust__origin')).toContainText('THƯƠNG HIỆU');
});
