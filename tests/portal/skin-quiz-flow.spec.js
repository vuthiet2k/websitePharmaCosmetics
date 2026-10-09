const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// 2026-10-05: luồng thật AI Skin Quiz → trang kết quả (Tier/Case/cờ an toàn, sản phẩm lấy qua
// /search?view=quizjson). Bấm đúng đáp án theo dữ liệu snippets/quiz_questions_data.bwt.
const raw = fs.readFileSync(path.join(__dirname, '../../snippets/quiz_questions_data.bwt'), 'utf8');
const questions = JSON.parse(raw.slice(raw.indexOf('{%- endcomment -%}') + '{%- endcomment -%}'.length));
const BASELINE = { 18: 0, 1: 3, 2: 2, 3: 3, 4: 1, 5: 3, 6: 3, 7: 2, 8: 3, 9: 2, 10: 0, 11: 3, 12: 1, 13: 3, 14: 0, 15: 2, 16: 1, 17: 3 };

async function startQuiz(page) {
  await page.addInitScript(() => {
    window.PharmaCrmIntakeConfig = { enabled: false, endpoint: '', timeout_ms: '10000' };
  });
  await page.goto('/kham-da-ai');
  await page.locator('.quick-reply-chip').first().click(); // "Bắt đầu khảo sát"
}

async function answer(page, overrides, stopAfterId) {
  const picks = Object.assign({}, BASELINE, overrides);
  for (const q of questions) {
    const text = q.options[picks[q.id]].text;
    await page.locator('.quick-reply-chip', { hasText: text }).first().click();
    if (q.id === stopAfterId) return;
  }
}

test('Tier 1: dấu hiệu cấp tính ⇒ dừng ngay, cảnh báo + Zalo, không mời xem sản phẩm', async ({ page }) => {
  await startQuiz(page);
  await answer(page, { 18: 1 }, 18);
  const card = page.locator('[data-quiz-red-flag]');
  await expect(card).toBeVisible();
  await expect(card.locator('.btn-result-zalo')).toHaveAttribute('href', /^https:\/\/zalo\.me\//);
  await expect(page.locator('.quick-reply-chip', { hasText: 'Xem các sản phẩm phù hợp' })).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('pc_quiz_result')));
  expect(stored).toMatchObject({ tier: 1, case_id: 'RED_FLAG' });
});

test('Nám + mang thai: Case 2, ẩn bước Cyspera/Retinol, sản phẩm thật không chứa retinol/kê toa', async ({ page }) => {
  await startQuiz(page);
  await answer(page, { 3: 0, 16: 0 });
  await expect(page.locator('[data-quiz-case="CASE_2"]')).toBeVisible();
  await expect(page.locator('.result-safety-note')).toContainText('mang thai');

  await page.goto('/ai-skin-quiz-results');
  await expect(page.locator('[data-result-title]')).toHaveText('Nám Mảng & Tăng Sắc Tố Thượng Bì');
  await expect(page.locator('[data-quiz-routine]')).toBeVisible();
  await expect(page.locator('[data-stage-grid]')).toBeHidden();
  await expect(page.locator('[data-quiz-step-blocked]')).toHaveCount(2);
  await expect(page.locator('.pc-quiz-routine__note')).toHaveCount(0); // ghi chú Cyspera ẩn theo bước bị chặn
  await expect(page.locator('[data-quiz-alert]')).toContainText('mang thai');
  // Chờ AJAX điền xong các bước không bị chặn.
  await expect.poll(() => page.locator('[data-quiz-step]:not([data-quiz-step-blocked]) .pc-quiz-step__product:empty').count()).toBe(0);
  const aliases = await page.locator('[data-quiz-step-product]').evaluateAll(els => els.map(e => e.getAttribute('data-quiz-step-product')));
  expect(aliases.length).toBeGreaterThan(0);
  for (const alias of aliases) expect(alias).not.toMatch(/retinol|tretinoin|altreno|aha|bha/);
  const gridLinks = await page.locator('[data-sapo-products-grid] a').evaluateAll(els => els.map(e => e.getAttribute('href')));
  for (const href of gridLinks) expect(href).not.toMatch(/retinol|altreno|aha-10-bha/);
  await expect(page.locator('[data-result-recommend]')).not.toContainText('Retinoid');
  // 2026-10-09: badge bấm được mở danh mục — không bao giờ dẫn tới danh mục Retinoid khi mang thai.
  await expect(page.locator('[data-result-recommend] a[data-result-collection]').first()).toHaveAttribute('href', '/tri-nam-sang-da-tranexamic-vitc');
  await expect(page.locator('[data-result-recommend] a[href="/retinol-chong-lao-hoa"]')).toHaveCount(0);
});

test('Da thường: Case 8, không chặn bước nào, routine có sản phẩm thật', async ({ page }) => {
  await startQuiz(page);
  await answer(page, {});
  await expect(page.locator('[data-quiz-case="CASE_8"]')).toBeVisible();
  await page.goto('/ai-skin-quiz-results');
  await expect(page.locator('[data-result-title]')).toHaveText('Da Thường Khoẻ Mạnh');
  await expect(page.locator('[data-quiz-step-blocked]')).toHaveCount(0);
  await expect(page.locator('[data-quiz-alert]')).toBeHidden();
  await expect.poll(() => page.locator('[data-quiz-step-product]').count()).toBeGreaterThan(0);
});
