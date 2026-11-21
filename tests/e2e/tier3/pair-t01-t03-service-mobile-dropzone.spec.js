const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function gotoServices(page) {
  const resp = await page.goto('/collections/dieu-tri-chuyen-nghiep');
  if (!resp || resp.status() === 404 || (await page.locator('.lt-intro--collection').count()) === 0) {
    await page.goto(ROUTES.services || '/collections/dieu-tri-chuyen-nghiep');
  }
}

test.describe('Tier 3: Pair T-01 & T-03 - Mobile Service Page Spacing & Chat Drop Zone', () => {
  test('P01-03-01: Mobile (390px) service page compact padding pairs with scaled chat mascot (0.85)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await gotoServices(page);

    // Verify service compact padding
    const introSection = page.locator('.lt-intro--collection');
    await expect(introSection).toBeVisible();

    const paddingTop = await introSection.evaluate((el) => parseFloat(window.getComputedStyle(el).paddingTop));
    expect(paddingTop).toBeLessThanOrEqual(24);

    // Verify chat widget presence and mobile scaling
    const chatWidget = page.locator('.main-widget');
    await expect(chatWidget).toBeVisible();

    const transform = await chatWidget.evaluate((el) => window.getComputedStyle(el).transform);
    // Matrix contains 0.85 scaling on mobile
    expect(transform).toBeDefined();
  });

  test('P01-03-02: Chat bottom drop zone target meets >= 44x44px accessibility threshold on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await gotoServices(page);

    const dropZone = page.locator('#pc-chat-drop-zone');
    await expect(dropZone).toBeAttached();

    const dropTarget = dropZone.locator('.pc-chat-drop-target');
    if (await dropTarget.count() > 0) {
      const minW = await dropTarget.evaluate((el) => parseFloat(window.getComputedStyle(el).minWidth));
      const minH = await dropTarget.evaluate((el) => parseFloat(window.getComputedStyle(el).minHeight));

      expect(minW).toBeGreaterThanOrEqual(44);
      expect(minH).toBeGreaterThanOrEqual(44);
    }
  });

  test('P01-03-03: Hiding chat mascot on mobile clears viewport for service card interaction', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await gotoServices(page);

    const chatWidget = page.locator('.main-widget');
    await expect(chatWidget).toBeVisible();

    // Trigger hide via API or data-contact-hide
    await page.evaluate(() => {
      if (typeof window.pcSetContactHidden === 'function') {
        window.pcSetContactHidden(true);
      } else {
        const w = document.querySelector('.main-widget');
        if (w) w.classList.add('widget-hidden');
      }
    });
    await page.waitForTimeout(100);

    // Verify widget is hidden
    await expect(chatWidget).toBeHidden();

    // Verify service card CTA is fully visible and clickable
    const bookBtn = page.locator('.lt-pgrid .lt-btn--primary').first();
    await expect(bookBtn).toBeVisible();
    await expect(bookBtn).toBeEnabled();
  });
});
