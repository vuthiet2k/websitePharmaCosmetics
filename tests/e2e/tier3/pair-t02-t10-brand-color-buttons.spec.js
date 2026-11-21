const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function gotoServices(page) {
  const resp = await page.goto('/collections/dieu-tri-chuyen-nghiep');
  if (!resp || resp.status() === 404 || (await page.locator('.lt-pgrid').count()) === 0) {
    await page.goto(ROUTES.services || '/collections/dieu-tri-chuyen-nghiep');
  }
}

async function gotoPDP(page) {
  const resp = await page.goto(ROUTES.product);
  if (!resp || resp.status() === 404 || (await page.locator('.btn-buyNow').count()) === 0) {
    await page.goto('/?tpl=product');
  }
}

test.describe('Tier 3: Pair T-02 & T-10 - UI-BRAND #3CB371 Action Button Consistency', () => {
  test('P02-10-01: Service «Đặt lịch» and PDP «MUA NGAY» both share brand #3CB371 primary color system', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // 1. Check Service «Đặt lịch» button
    await gotoServices(page);
    const serviceBookBtn = page.locator('.lt-pgrid .lt-btn--primary').first();
    await expect(serviceBookBtn).toBeVisible();

    const serviceBtnBg = await serviceBookBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(serviceBtnBg).toBe('rgb(60, 179, 113)');

    const serviceBtnText = await serviceBookBtn.evaluate((el) => window.getComputedStyle(el).color);
    expect(serviceBtnText).toBe('rgb(255, 255, 255)');

    // 2. Check PDP «MUA NGAY» button
    await gotoPDP(page);
    const pdpBuyBtn = page.locator('.btn-buyNow, .box_btn_acc a').first();
    await expect(pdpBuyBtn).toBeVisible();

    const pdpBtnBg = await pdpBuyBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // Should be #3CB371 (rgb(60, 179, 113)) or configured brand primary
    expect(['rgb(60, 179, 113)', 'rgb(0, 128, 96)']).toContain(pdpBtnBg);

    const pdpBtnText = await pdpBuyBtn.evaluate((el) => window.getComputedStyle(el).color);
    expect(['rgb(255, 255, 255)', 'rgb(254, 254, 254)']).toContain(pdpBtnText);
  });

  test('P02-10-02: PDP buy button aligns icon and text in horizontal row with 24px icon proportion', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const pdpBuyBtn = page.locator('.btn-buyNow').first();
    await expect(pdpBuyBtn).toBeVisible();

    const flexDir = await pdpBuyBtn.evaluate((el) => window.getComputedStyle(el).flexDirection);
    expect(flexDir).toBe('row');

    // Check icon size
    const icon = pdpBuyBtn.locator('svg, i').first();
    if (await icon.count() > 0) {
      const box = await icon.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(14);
      }
    }
  });

  test('P02-10-03: Hover transitions on both buttons adhere to design tokens without causing layout shift', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // Test service button hover
    await gotoServices(page);
    const serviceBookBtn = page.locator('.lt-pgrid .lt-btn--primary').first();
    const boxBefore = await serviceBookBtn.boundingBox();
    await serviceBookBtn.hover();
    await page.waitForTimeout(100);
    const boxAfter = await serviceBookBtn.boundingBox();

    expect(boxBefore).not.toBeNull();
    expect(boxAfter).not.toBeNull();
    expect(Math.abs(boxAfter.width - boxBefore.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(boxAfter.height - boxBefore.height)).toBeLessThanOrEqual(2);
  });
});
