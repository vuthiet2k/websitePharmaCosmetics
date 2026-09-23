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
