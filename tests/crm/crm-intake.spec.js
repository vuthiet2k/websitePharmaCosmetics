const { test, expect } = require('@playwright/test');

test.describe('CRM Intake độc lập', () => {
  test('Quiz chỉ mở xác nhận và safe-mode không gửi dữ liệu khi CRM chưa cấu hình', async ({ page }) => {
    await page.addInitScript(() => {
      window.PharmaCrmIntakeConfig = { enabled: false, endpoint: '', timeout_ms: '10000' };
    });
    const crmRequests = [];
    page.on('request', request => {
      if (/script\.google\.com\/macros\//.test(request.url())) crmRequests.push(request.url());
    });

    await page.goto('/kham-da-ai');
    await expect(page.locator('.quick-reply-chip').first()).toBeVisible();
    await page.locator('.quick-reply-chip').first().click();

    // Preview có thể nạp bộ 5 hoặc 17 câu từ dữ liệu Liquid; hoàn tất cả hai trường hợp.
    for (let index = 0; index < 20; index += 1) {
      if (await page.locator('#btnSaveAiResult').count()) break;
      await page.waitForFunction(() => Boolean(
        document.querySelector('#btnSaveAiResult') || document.querySelector('.quick-reply-chip')
      ));
      if (await page.locator('#btnSaveAiResult').count()) break;
      await page.locator('.quick-reply-chip').first().click();
    }

    await expect(page.locator('#btnSaveAiResult')).toBeVisible();
    await page.locator('#btnSaveAiResult').click();
    await expect(page.locator('#aiSkinCrmConsentModal')).toBeVisible();
    await expect(page.locator('#aiSkinCrmConsentAccept')).toBeDisabled();
    await expect(page.locator('#aiSkinCrmConsentStatus')).not.toBeEmpty();
    expect(crmRequests).toEqual([]);
  });

  test('Quiz gửi save_ai_chat kèm consent khi khách đồng ý lưu (2026-10-05)', async ({ page }) => {
    // Endpoint giả: chặn request GAS bằng page.route — không ghi dữ liệu lên Sheet thật.
    await page.addInitScript(() => {
      window.PharmaCrmIntakeConfig = { enabled: true, endpoint: 'https://script.google.com/macros/s/test-crm/exec', timeout_ms: '10000' };
    });
    const bodies = [];
    await page.route(/script\.google\.com\/macros\//, async route => {
      const body = JSON.parse(route.request().postData() || '{}');
      bodies.push(body);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, record_id: body.submission_id }) });
    });

    await page.goto('/kham-da-ai');
    await page.locator('.quick-reply-chip').first().click();
    for (let index = 0; index < 20; index += 1) {
      if (await page.locator('#btnSaveAiResult').count()) break;
      await page.waitForFunction(() => Boolean(
        document.querySelector('#btnSaveAiResult') || document.querySelector('.quick-reply-chip')
      ));
      if (await page.locator('#btnSaveAiResult').count()) break;
      await page.locator('.quick-reply-chip').first().click();
    }

    await page.locator('#btnSaveAiResult').click();
    await expect(page.locator('#aiSkinCrmConsentAccept')).toBeEnabled();
    await page.locator('#aiSkinCrmConsentAccept').click();
    await expect.poll(() => bodies.filter(b => b.action === 'save_ai_chat').length).toBe(1);
    const saved = bodies.find(b => b.action === 'save_ai_chat');
    expect(saved.consent).toBe(true);
    expect(saved.consent_at).toBeTruthy();
    expect(saved.skin_type).toBeTruthy();
    expect(saved.answers).toBeTruthy();
    await expect(page.locator('#aiSkinCrmConsentStatus')).not.toHaveText('Đang lưu…');
  });

  test('Trang đặt lịch nạp customer context và client CRM tách riêng', async ({ page }) => {
    await page.goto('/dat-lich-tu-van');
    await expect(page.locator('#mops-customer-phone')).toBeVisible();
    await expect.poll(() => page.evaluate(() => ({
      customer: typeof window.PharmaCrmCustomerContext,
      client: typeof window.PharmaCrmIntake,
      endpoint: (window.PharmaCrmIntakeConfig || {}).endpoint
    }))).toMatchObject({ customer: 'object', client: 'object' });
    await expect(page.locator('#mops-customer-phone')).toHaveAttribute('value', '');
  });
});
