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

test('kết quả hết hạn bị bỏ qua ⇒ trang ở chế độ minh hoạ, không mời lưu', async ({ page }) => {
  await seed(page, -1000);
  await page.goto('/ai-skin-quiz-results');
  await expect(page.locator('#pcQuizResultsRoot')).toHaveAttribute('data-demo', 'true');
  await expect(page.locator('[data-profile-prompt]')).toBeHidden();
  await expect(page.locator('[data-result-clear]')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('pcr:pc_skin_scan_result'))).toBeNull();
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
