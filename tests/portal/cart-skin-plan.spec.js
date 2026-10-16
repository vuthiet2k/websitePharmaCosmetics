const { test, expect } = require('@playwright/test');

// 2026-10-16: khối "Phác đồ cho làn da của bạn" ở /cart (snippets/cart_skin_plan.bwt) — đọc kết quả soi da / khảo sát
// trong localStorage "pcr:*", đối chiếu SP trong giỏ với 3 giai đoạn (danh mục settings.skin_result_col_*).
function seed(page, entries) {
  return page.addInitScript((list) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    window.PharmaCrmIntakeConfig = { enabled: false, endpoint: '', timeout_ms: '10000' };
    Object.keys(list).forEach((k) => {
      localStorage.setItem('pcr:' + k, JSON.stringify({ v: list[k], exp: Date.now() + 3600 * 1000 }));
    });
  }, entries);
}

const scan = JSON.stringify({
  saved_at: Date.now(),
  scores: {
    acne: { raw_score: 0.8, ui_score: 40 }, pigmentation: { raw_score: 0.2, ui_score: 85 },
    wrinkles: { raw_score: 0.1, ui_score: 90 }, redness: { raw_score: 0.3, ui_score: 75 }, pores: { raw_score: 0.4, ui_score: 70 }
  },
  primary_concern: 'acne', skin_type: 'Da dầu mụn', regimen: [], recommended_products: []
});

async function clearCart(page) {
  await page.context().clearCookies();
}

// Dữ liệu demo: mọi SP có 2 phân loại ⇒ snippet để variant_id rỗng (nút "Xem chi tiết", chọn phân loại ở trang SP).
// Giả lập SP 1 phân loại (variant đầu = id + "1" trong data/products.js) để kiểm luồng "Thêm vào giỏ".
async function singleVariant(page) {
  await page.route('**/cart', async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace(/\{ "id": (\d+),([^{}]*?)"variant_id": ""/g, (m, id, mid) => '{ "id": ' + id + ',' + mid + '"variant_id": "' + id + '1"');
    await route.fulfill({ response: res, body });
  });
}

async function addVariant(page, variantId) {
  const res = await page.request.post('/cart/add.js', { form: { quantity: '1', variantId: String(variantId) } });
  expect(res.ok()).toBeTruthy();
}

test('chưa có kết quả ⇒ mời soi da / khảo sát, nút trỏ đúng trang', async ({ page }) => {
  await clearCart(page);
  await seed(page, {});
  await page.goto('/cart');
  const box = page.locator('[data-cart-skin]');
  await expect(box).toBeVisible();
  await expect(box).toHaveAttribute('data-state', 'empty');
  await expect(box.locator('[data-cart-skin-scan]')).toHaveAttribute('href', '/ai-skin-quiz?tab=camera');
  await expect(box.locator('[data-cart-skin-quiz]')).toHaveAttribute('href', '/ai-skin-quiz');
  await expect(box.locator('[data-cart-skin-body]')).toBeHidden();
});

test('kết quả soi da (mụn) ⇒ 3 giai đoạn, SP trong giỏ đánh dấu đúng giai đoạn, thêm SP gợi ý cập nhật giỏ', async ({ page }) => {
  await clearCart(page);
  await seed(page, { pc_skin_scan_result: scan });
  await singleVariant(page);
  await page.goto('/cart');
  const cols = await page.evaluate(() => window.PharmaResultCollections);
  const soothing = cols.soothing.products.find((p) => p.variant_id);
  await addVariant(page, soothing.variant_id);
  await page.reload();

  const box = page.locator('[data-cart-skin]');
  await expect(box).toHaveAttribute('data-state', 'plan');
  await expect(box.locator('[data-cart-skin-basis]')).toContainText('soi da AI');
  await expect(box.locator('[data-cart-skin-stage]')).toHaveCount(3);
  // Mụn ⇒ giai đoạn 3 = danh mục BHA.
  await expect(box.locator('[data-cart-skin-stage="3"]')).toHaveAttribute('data-stage-key', 'bha');
  await expect(box.locator('[data-cart-skin-stage="1"]')).toHaveClass(/is-done/);
  await expect(box.locator('[data-cart-skin-stage="1"]')).toContainText(soothing.name);
  await expect(box.locator('[data-cart-skin-progress]')).toContainText('1/3');
  await expect(box.locator('[data-cart-skin-view="bha"]')).toHaveAttribute('href', cols.bha.url);
  await expect(box.locator('[data-cart-skin-solution]')).toHaveAttribute('href', '/giai-phap-mun-trung-ca');
  await expect(box.locator('[data-cart-skin-active]').first()).toBeVisible();

  // Thêm SP gợi ý của giai đoạn 2 ⇒ giỏ dựng lại, giai đoạn 2 thành "đã có".
  const stage2 = box.locator('[data-cart-skin-stage="2"]');
  await stage2.locator('[data-cart-skin-add]').click();
  await expect(stage2).toHaveClass(/is-done/);
  await expect(box.locator('[data-cart-skin-progress]')).toContainText('2/3');
  const count = await page.evaluate(() => fetch('/cart.js').then((r) => r.json()).then((c) => c.item_count));
  expect(count).toBe(2);
  await box.screenshot({ path: 'test-results/cart-skin-plan.png' });
});

test('khảo sát có cờ thai kỳ ⇒ cảnh báo SP retinoid trong giỏ, giai đoạn retinoid chuyển chuyên gia', async ({ page }) => {
  await clearCart(page);
  await seed(page, {
    pc_quiz_skin_type: 'aging',
    pc_quiz_saved_at: String(Date.now()),
    pc_quiz_result: JSON.stringify({ tier: 4, case_id: 'CASE_3', red_flag: '', top_skin_type: 'aging', safety_flags: ['pregnancy'], excluded_actives: ['retinoid', 'bha', 'aha', 'cysteamine'] })
  });
  await singleVariant(page);
  await page.goto('/cart');
  const cols = await page.evaluate(() => window.PharmaResultCollections);
  const retinol = cols.retinoid.products.find((p) => p.variant_id && /retin/i.test(p.name + p.alias));
  await addVariant(page, retinol.variant_id);
  await page.reload();

  const box = page.locator('[data-cart-skin]');
  await expect(box.locator('[data-cart-skin-basis]')).toContainText('Lão Hoá');
  await expect(box.locator('[data-cart-skin-warn]')).toContainText(retinol.name);
  const stage3 = box.locator('[data-cart-skin-stage="3"]');
  await expect(stage3).toHaveClass(/is-blocked/);
  await expect(stage3.locator('[data-cart-skin-add]')).toHaveCount(0);
  // Không gợi ý SP chứa hoạt chất bị loại ở bất kỳ bước nào.
  const picks = await box.locator('[data-cart-skin-pick] .pc-cart-skin__pick-name').allTextContents();
  picks.forEach((name) => expect(name).not.toMatch(/retin|bha|salicylic|aha|glycolic/i));
});

test('Tier 1 (dấu hiệu cấp tính) ⇒ chỉ cảnh báo + liên hệ chuyên gia, không gợi ý sản phẩm', async ({ page }) => {
  await clearCart(page);
  await seed(page, {
    pc_quiz_skin_type: 'sensitive',
    pc_quiz_saved_at: String(Date.now()),
    pc_quiz_result: JSON.stringify({ tier: 1, case_id: 'RED_FLAG', red_flag: 'red_flag_infection', top_skin_type: 'sensitive', safety_flags: [], excluded_actives: [] })
  });
  await page.goto('/cart');
  const box = page.locator('[data-cart-skin]');
  await expect(box).toHaveAttribute('data-state', 'red-flag');
  await expect(box.locator('.pc-cart-skin__alert--danger')).toBeVisible();
  await expect(box.locator('.pc-cart-skin__zalo')).toBeVisible();
  await expect(box.locator('[data-cart-skin-body]')).toBeHidden();
});
