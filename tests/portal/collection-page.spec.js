const { test, expect } = require('@playwright/test');

// 2026-10-10: trang danh mục theo thiết kế design/danh-muc/danh-muc-san-pham.png.
const URL = '/lam-diu-on-dinh-nen-da';

test('banner: h1 duy nhất = tên danh mục, có nhãn nhỏ và 4 cam kết', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.pc-col-hero h1')).toHaveText('Làm Dịu & Ổn Định Nền Da');
  await expect(page.locator('.pc-col-hero__eyebrow')).toHaveText('PHARMA COSMETICS');
  await expect(page.locator('.pc-col-hero__usp')).toHaveCount(4);
});

test('dải voucher riêng dưới banner: ô màu theo mức giảm, "Lấy mã" + popup điều kiện', async ({ page }) => {
  await page.goto(URL);
  const vouchers = page.locator('.pc-voucher');
  await expect(vouchers.first()).toBeVisible();
  // Nằm giữa banner và cột lọc/sản phẩm.
  const heroBottom = await page.locator('.pc-col-hero').evaluate(e => e.getBoundingClientRect().bottom);
  const stripTop = await page.locator('.pc-vouchers').evaluate(e => e.getBoundingClientRect().top);
  const gridTop = await page.locator('.block-collection').evaluate(e => e.getBoundingClientRect().top);
  expect(stripTop).toBeGreaterThanOrEqual(heroBottom);
  expect(gridTop).toBeGreaterThan(stripTop);
  await expect(vouchers.first().locator('.pc-voucher__badge')).toHaveText('-50K');
  await expect(page.locator('.pc-voucher--percent .pc-voucher__badge')).toHaveText('-10%'); // mã VIP6 "10%" ⇒ phần trăm
  await expect(vouchers.first().locator('.js-copy')).toHaveAttribute('data-copy', 'LAMQUEN');
  await vouchers.first().locator('.info-button').click();
  await expect(page.locator('.popup-coupon')).toHaveClass(/active/);
  await expect(page.locator('.popup-coupon .code')).toHaveText('LAMQUEN');
});

test('bộ lọc nhanh từ menu, "Sản phẩm (N)" + sắp xếp, nút sắp xếp nhanh cũ đã ẩn', async ({ page }) => {
  await page.goto(URL);
  const chips = page.locator('.pc-quick-filters__chip');
  await expect(chips.first()).toHaveText('Mặc định');
  await expect(page.locator('.pc-quick-filters__chip.is-active')).toHaveAttribute('href', URL); // chip trùng danh mục đang xem
  await expect(page.locator('.sort-cate-count')).toContainText(/Sản phẩm \(\d+\)/);
  await expect(page.locator('.sort-cate-select__input')).toBeVisible();
  await expect(page.locator('.sort-cate-right')).toBeHidden();
  await page.locator('.pc-quick-filters__chip', { hasText: 'Cấp ẩm sâu' }).click();
  await expect(page).toHaveURL(/\/duong-am-phuc-hoi-b5-ha$/);
});

test('thẻ sản phẩm: nhãn giảm %, nhãn tag nhan:, chip voucher/freeship, thêm giỏ, yêu thích', async ({ page }) => {
  await page.goto(URL);
  const sale = page.locator('.pc-pcard', { has: page.locator('.pc-pcard__badge--sale') }).first();
  await expect(sale.locator('.pc-pcard__badge')).toHaveText(/Giảm \d+%/);
  await expect(sale.locator('.pc-pcard__chip--voucher')).toHaveText(/Voucher -10%/);
  await expect(page.locator('.pc-pcard__badge--pick')).toHaveText('Đề xuất');
  await expect(page.locator('.pc-pcard__chip--freeship').first()).toBeVisible();

  // SP nhiều phiên bản ⇒ nút giỏ là link sang trang SP (không đoán phiên bản).
  await expect(sale.locator('a.pc-pcard__cart')).toHaveAttribute('href', /sua-rua-mat-amino-acid/);

  // favorite_js tải /products/<alias>?view=favorite (Sapo thật trả 200; dev-server cũ chưa có route này).
  await page.route(/\/products\/[^?]+\?view=favorite/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<div></div>' }));
  const heart = sale.locator('[data-pc-wish]');
  await heart.click();
  await expect(heart).toHaveClass(/is-active/);
  expect((await page.context().cookies()).some(c => c.name === 'sudes_wishlist_products')).toBe(true);
});

test('SP 1 phiên bản còn hàng: nút giỏ thêm bằng AJAX, không rời trang', async ({ page }) => {
  await page.goto('/duong-am-phuc-hoi-b5-ha');
  const card = page.locator('.pc-pcard', { has: page.locator('button.add_to_cart') }).first();
  await expect(card.locator('.pc-pcard__badge')).toHaveText(/Giảm \d+%/); // đang giảm giá ⇒ nhãn giảm % ưu tiên hơn tag nhan:Hàng mới
  const req = page.waitForRequest(r => r.url().includes('/cart/add') && r.method() === 'POST');
  await card.locator('button.add_to_cart').click();
  await req;
  await expect(page).toHaveURL(/\/duong-am-phuc-hoi-b5-ha$/);
});

test('kết quả lọc AJAX (search view=data) dùng thẻ mới; nút danh sách đổi bố cục', async ({ page }) => {
  const html = await (await page.request.get('/search?query=kem&view=data')).text();
  expect(html).toContain('pc-pcard__name');
  expect(html).not.toContain('item-product-main');
  await page.goto(URL);
  await page.locator('[data-pc-view="list"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-pc-view', 'list');
  const dir = await page.locator('.pc-pcard').first().evaluate(e => getComputedStyle(e).flexDirection);
  expect(dir).toBe('row');
});

test.describe('điện thoại', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test('không tràn ngang, dải voucher có tiêu đề "Voucher cho danh mục này"', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.pc-vouchers__title')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  });
});
