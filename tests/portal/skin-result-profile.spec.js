const { test, expect } = require('@playwright/test');

// 2026-10-10: kết quả soi da/khảo sát lưu trên thiết bị (localStorage "pcr:*", hạn settings.skin_result_retention_days)
// ⇒ quay lại trang kết quả vẫn còn kết quả + lời mời tạo hồ sơ; khách vãng lai phải đăng nhập mới lưu.
const scan = {
  saved_at: Date.now(),
  scores: {
    acne: { raw_score: 0.8, ui_score: 40 }, pigmentation: { raw_score: 0.2, ui_score: 85 },
    wrinkles: { raw_score: 0.1, ui_score: 90 }, redness: { raw_score: 0.3, ui_score: 75 }, pores: { raw_score: 0.4, ui_score: 70 }
  },
  primary_concern: 'acne', regimen: [], recommended_products: []
};

function seed(page, expiresInMs) {
  return page.addInitScript(([value, ttl]) => {
    if (sessionStorage.getItem('seeded')) return; // chỉ gieo 1 lần — reload sau khi xoá phải thấy trạng thái trống
    sessionStorage.setItem('seeded', '1');
    window.PharmaCrmIntakeConfig = { enabled: false, endpoint: '', timeout_ms: '10000' };
    localStorage.setItem('pcr:pc_skin_scan_result', JSON.stringify({ v: value, exp: Date.now() + ttl }));
  }, [JSON.stringify(scan), expiresInMs]);
}

test('kết quả trên thiết bị còn hạn ⇒ hiện kết quả thật + mời đăng nhập để lưu hồ sơ', async ({ page }) => {
  await seed(page, 60 * 60 * 1000);
  await page.goto('/ai-skin-quiz-results');
  await expect(page.locator('#pcQuizResultsRoot')).toHaveAttribute('data-demo', 'false');
  const prompt = page.locator('[data-profile-prompt]');
  await expect(prompt).toBeVisible();
  await expect(prompt.locator('[data-profile-prompt-action]')).toHaveText('Đăng nhập để lưu hồ sơ');

  await prompt.locator('[data-profile-prompt-action]').click();
  await page.waitForURL(/\/account\/login/);
  const ret = await page.evaluate(() => JSON.parse(localStorage.getItem('pc_login_return')));
  expect(ret.path).toBe('/ai-skin-quiz-results');
});

test('đăng nhập xong (Sapo về /account) ⇒ quay lại trang kết quả và tự mở hộp đồng ý lưu', async ({ page }) => {
  await seed(page, 60 * 60 * 1000);
  await page.addInitScript(() => {
    if (location.pathname === '/account' && !sessionStorage.getItem('ret-seeded')) {
      sessionStorage.setItem('ret-seeded', '1');
      localStorage.setItem('pc_login_return', JSON.stringify({ path: '/ai-skin-quiz-results', at: Date.now() }));
    }
    // dev-server chỉ gắn khách đăng nhập ở trang tài khoản ⇒ ép ngữ cảnh đăng nhập cho trang kết quả.
    if (location.pathname === '/ai-skin-quiz-results') {
      Object.defineProperty(window, 'PharmaCrmCustomerContext', { configurable: false, get: () => ({ logged_in: true, name: 'Khách Test' }), set: () => {} });
    }
  });
  await page.goto('/account');
  await page.waitForURL(/\/ai-skin-quiz-results$/);
  await expect(page.locator('#aiSkinCrmConsentModal')).toBeVisible();
  await expect(page.locator('[data-profile-prompt-action]')).toHaveText('Lưu hồ sơ ngay');
  expect(await page.evaluate(() => localStorage.getItem('pc_login_return'))).toBeNull();
});

test('kết quả hết hạn bị bỏ qua ⇒ "chưa có hồ sơ" + 2 nút tạo ngay, ẩn toàn bộ khối kết quả', async ({ page }) => {
  await seed(page, -1000);
  await page.goto('/ai-skin-quiz-results');
  await expect(page.locator('#pcQuizResultsRoot')).toHaveAttribute('data-demo', 'true');
  await expectEmptyState(page);
  await expect(page.locator('[data-profile-prompt]')).toBeHidden();
  await expect(page.locator('[data-result-clear]')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('pcr:pc_skin_scan_result'))).toBeNull();
});

// 2026-10-10: giao diện chưa có hồ sơ theo design/ket-qua-da/chua-co-ho-so.png — cảnh báo ở trên, khối giới thiệu (h1) ở dưới.
async function expectEmptyState(page) {
  await expect(page.locator('[data-result-empty-view]')).toBeVisible();
  await expect(page.locator('[data-result-empty-title]')).toHaveText('Bạn chưa có hồ sơ chăm sóc da');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Hiểu làn da để chăm đúng cách');
  await expect(page.locator('[data-result-empty-scan]')).toHaveAttribute('href', '/ai-skin-quiz?tab=camera');
  await expect(page.locator('[data-result-empty-quiz]')).toHaveAttribute('href', '/ai-skin-quiz');
  for (const sel of ['[data-result-disclaimer]', '[data-result-profile]', '[data-customer-card]', '[data-result-recommend]', '[data-result-products-section]', '[data-result-blogs-section]']) {
    await expect(page.locator(sel)).toBeHidden();
  }
  // Nút đóng chỉ ẩn thanh cảnh báo, giữ phần mời soi da / khảo sát.
  await page.locator('[data-result-empty-close]').click();
  await expect(page.locator('[data-result-empty-warning]')).toBeHidden();
  await expect(page.locator('[data-result-empty-scan]')).toBeVisible();
}

test('chưa từng soi da / chat ⇒ trạng thái chưa có hồ sơ', async ({ page }) => {
  await page.goto('/ai-skin-quiz-results');
  await expectEmptyState(page);
});

test('thiết bị trống nhưng GAS trả hồ sơ khớp mã phiên ⇒ dựng lại kết quả soi da từ CRM', async ({ page }) => {
  await page.addInitScript(() => {
    window.PharmaCrmIntakeConfig = { enabled: true, endpoint: 'https://script.google.com/macros/s/test/exec', timeout_ms: '5000' };
  });
  let lookups = 0;
  await page.route('https://script.google.com/**', async route => {
    lookups++;
    const body = JSON.parse(route.request().postData() || '{}');
    expect(body.action).toBe('get_customer_info');
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      success: true, found: true, source: 'ai_skin_scan_camera',
      record: { submission_id: 'sub_crm_1', created_at: '2026-10-09T08:00:00Z', customer_name: 'Khách CRM',
        skin_type: 'Báo cáo soi da camera', primary_concern: 'pigmentation', regimen: [], recommended_products: [],
        scores: { acne: { raw_score: 0.1, ui_score: 90 }, pigmentation: { raw_score: 0.9, ui_score: 30 }, wrinkles: { raw_score: 0.2, ui_score: 85 }, redness: { raw_score: 0.2, ui_score: 85 }, pores: { raw_score: 0.2, ui_score: 85 } } }
    }) });
  });
  await page.goto('/ai-skin-quiz-results');
  await expect(page.locator('[data-scan-radar]')).toBeVisible();
  await expect(page.locator('#pcQuizResultsRoot')).toHaveAttribute('data-demo', 'false');
  await expect(page.locator('[data-scan-stage-products="3"] a')).toHaveAttribute('href', '/tri-nam-sang-da-tranexamic-vitc');
  await expect(page.locator('[data-crm-storage-state]')).toHaveText('Đã đồng bộ');
  await expect(page.locator('[data-profile-prompt]')).toBeHidden();
  expect(lookups).toBeLessThanOrEqual(2); // tải lại đúng 1 lần, không lặp
});

// 2026-10-10: soi da ⇒ gợi ý nằm trong dải SP của 3 giai đoạn (khối "Sản phẩm đề xuất" riêng được ẩn để không lặp).
test('gợi ý sản phẩm theo giai đoạn lấy đúng danh mục, không có thuốc kê toa', async ({ page }) => {
  await seed(page, 60 * 60 * 1000); // soi da: mụn cao nhất
  await page.goto('/ai-skin-quiz-results');
  const expected = { 1: 'soothing', 2: 'barrier', 3: 'bha' };
  for (const [stage, key] of Object.entries(expected)) {
    const cards = page.locator(`[data-plan-stage="${stage}"] .pc-plan-card__name`);
    await expect(cards.first()).toBeVisible();
    const hrefs = await cards.evaluateAll(els => els.map(e => e.getAttribute('href')));
    const allowed = await page.evaluate(k => window.PharmaResultCollections[k].products.map(p => p.url), key);
    for (const h of hrefs) expect(allowed).toContain(h);
    expect(hrefs.join(' ')).not.toMatch(/altreno|tretinoin/);
  }
  await expect(page.locator('[data-result-products-section]')).toBeHidden();
});

test('nút xoá kết quả trên thiết bị xoá sạch và trang trở về minh hoạ', async ({ page }) => {
  await seed(page, 60 * 60 * 1000);
  await page.goto('/ai-skin-quiz-results');
  page.once('dialog', d => d.accept());
  await page.locator('[data-result-clear]').click();
  await page.waitForLoadState('load');
  await expect(page.locator('#pcQuizResultsRoot')).toHaveAttribute('data-demo', 'true');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('pcr:pc_skin')))).toEqual([]);
});

// 2026-10-10: /ai-skin-quiz?tab=camera phải mở tab soi da AI (trước đây luôn rơi vào tab khảo sát chat).
test('nút "Bắt đầu ngay" ở trang kết quả mở đúng tab soi da AI; ?tab=quiz mở khảo sát; bấm tab cập nhật URL', async ({ page }) => {
  await page.goto('/ai-skin-quiz-results');
  await page.locator('[data-result-empty-scan]').click();
  await page.waitForURL(/\/ai-skin-quiz\?tab=camera$/);
  await expect(page.locator('[data-skin-mode="camera"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-skin-scan]')).toBeVisible();
  await expect(page.locator('#aiSkinChatApp')).toBeHidden();

  await page.goto('/ai-skin-quiz?tab=quiz');
  await expect(page.locator('[data-skin-mode="quiz"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#aiSkinChatApp')).toBeVisible();
  await page.locator('[data-skin-mode="camera"]').click();
  await expect(page).toHaveURL(/\?tab=camera$/);
  await page.reload();
  await expect(page.locator('[data-skin-mode="camera"]')).toHaveAttribute('aria-selected', 'true');

  await page.goto('/ai-skin-quiz');
  await expect(page.locator('[data-skin-mode="quiz"]')).toHaveAttribute('aria-selected', 'true');
});

// 2026-10-10: trang khảo sát / soi da — đã có hồ sơ thì có thanh nhắc + nút xem lại kết quả.
test('trang khảo sát: chưa có kết quả ⇒ không có thanh; có kết quả soi da ⇒ thanh "đã có hồ sơ" + xem lại; đóng thì ẩn', async ({ page }) => {
  await page.goto('/ai-skin-quiz');
  await expect(page.locator('[data-skin-profile-notice]')).toBeHidden();

  await page.evaluate(() => window.PharmaResultStore.set('pc_skin_scan_result', JSON.stringify({
    saved_at: new Date(2026, 9, 9, 9, 0).getTime(), primary_concern: 'acne',
    scores: { acne: { raw_score: 0.9 }, pigmentation: { raw_score: 0.1 }, wrinkles: { raw_score: 0.1 }, redness: { raw_score: 0.1 }, pores: { raw_score: 0.1 } }
  })));
  const notice = page.locator('[data-skin-profile-notice]');
  await expect(notice).toBeVisible(); // tự hiện ngay nhờ sự kiện pc:result-store
  await expect(notice).toContainText('Bạn đã có hồ sơ chăm sóc da');
  await expect(notice).toContainText('Kết quả soi da AI ngày 09/10/2026');
  await expect(notice.locator('[data-skin-profile-notice-link]')).toHaveAttribute('href', '/ai-skin-quiz-results');

  await page.reload();
  await expect(notice).toBeVisible();
  await notice.locator('[data-skin-profile-notice-close]').click();
  await expect(notice).toBeHidden();
  await page.reload();
  await expect(notice).toBeHidden(); // đóng rồi thì ẩn tới khi có kết quả mới hơn
  await page.evaluate(() => window.PharmaResultStore.clearAll());
});

test('trang khảo sát: làm xong khảo sát chat ⇒ thanh hiện "khảo sát chat" ngay', async ({ page }) => {
  const fs = require('fs'); const path = require('path');
  const raw = fs.readFileSync(path.join(__dirname, '../../snippets/quiz_questions_data.bwt'), 'utf8');
  const questions = JSON.parse(raw.slice(raw.indexOf('{%- endcomment -%}') + '{%- endcomment -%}'.length));
  const BASELINE = { 18: 0, 1: 3, 2: 2, 3: 3, 4: 1, 5: 3, 6: 3, 7: 2, 8: 3, 9: 2, 10: 0, 11: 3, 12: 1, 13: 3, 14: 0, 15: 2, 16: 1, 17: 3 };
  await page.addInitScript(() => { window.PharmaCrmIntakeConfig = { enabled: false, endpoint: '', timeout_ms: '10000' }; });
  await page.goto('/ai-skin-quiz?tab=quiz');
  await expect(page.locator('[data-skin-profile-notice]')).toBeHidden();
  await page.locator('.quick-reply-chip').first().click();
  for (const q of questions) await page.locator('.quick-reply-chip', { hasText: q.options[BASELINE[q.id]].text }).first().click();
  await expect(page.locator('[data-skin-profile-notice]')).toContainText('Kết quả khảo sát chat ngày');
  await page.evaluate(() => window.PharmaResultStore.clearAll());
});


// 2026-10-10: khối "Định hướng phác đồ tham khảo" theo design/ket-qua-da/dinh-huong-phac-do.png.
test('phác đồ: 5 thẻ chỉ số, 3 giai đoạn có dải SP đúng danh mục, thêm vào giỏ, yêu thích, carousel', async ({ page }) => {
  // dev-server mỗi danh mục chỉ 2–3 SP ⇒ nhân giai đoạn 1 lên 8 SP để thử nút trượt/chấm.
  await page.addInitScript(() => {
    let value;
    Object.defineProperty(window, 'PharmaResultCollections', { configurable: true, get: () => value, set: v => {
      if (v && v.soothing && v.soothing.products.length) {
        const base = v.soothing.products;
        v.soothing.products = Array.from({ length: 8 }, (_, i) => Object.assign({}, base[i % base.length], { alias: base[i % base.length].alias + (i >= base.length ? '-' + i : '') }));
      }
      value = v;
    } });
  });
  await seed(page, 60 * 60 * 1000);
  await page.goto('/ai-skin-quiz-results');
  await expect(page.locator('[data-scan-score]')).toHaveCount(5);
  await expect(page.locator('[data-plan-stage]')).toHaveCount(3);
  await expect(page.locator('[data-plan-stage="1"] .pc-plan-stage__title')).toHaveText(/Làm dịu/);
  await expect(page.locator('[data-plan-stage="3"] [data-plan-view-all]')).toHaveAttribute('href', '/hoat-chat-bha-salicylic');
  await expect(page.locator('[data-result-products-section]')).toBeHidden(); // không lặp với dải SP giai đoạn
  await expect(page.locator('.pc-plan-card')).not.toHaveCount(0);
  expect((await page.locator('.pc-plan-card').evaluateAll(e => e.map(x => x.getAttribute('data-plan-product')))).join(' ')).not.toMatch(/altreno|tretinoin/);

  // Carousel: giai đoạn 1 có 8 SP ⇒ có nút sau + chấm; bấm sau thì dải trượt.
  const s1 = page.locator('[data-plan-stage="1"]');
  await expect(s1.locator('[data-plan-next]')).toBeVisible();
  const before = await s1.locator('.pc-plan-stage__track').evaluate(t => t.scrollLeft);
  await s1.locator('[data-plan-next]').click();
  await expect.poll(() => s1.locator('.pc-plan-stage__track').evaluate(t => t.scrollLeft)).toBeGreaterThan(before);

  // Thêm vào giỏ (SP 1 phiên bản còn hàng) ⇒ POST /cart/add.js, nút đổi nhãn.
  const addBtn = page.locator('[data-plan-stage="3"] button[data-plan-add]').first();
  const req = page.waitForRequest(r => r.url().endsWith('/cart/add.js') && r.method() === 'POST');
  await addBtn.click();
  expect((await req).postData()).toMatch(/variantId=[0-9]+/);
  await expect(addBtn).toHaveText(/Đã thêm vào giỏ/);

  // Yêu thích: bấm tim ⇒ is-active + lưu cookie danh sách yêu thích của theme.
  const heart = page.locator('[data-plan-stage="3"] .pc-plan-card__wish').first();
  await heart.click();
  await expect(heart).toHaveClass(/is-active/);
  expect((await page.context().cookies()).some(c => c.name === 'sudes_wishlist_products')).toBe(true);
});
