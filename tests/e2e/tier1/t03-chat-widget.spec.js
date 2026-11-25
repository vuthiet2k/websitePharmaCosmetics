const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-03: Chat Widget Mascot and Drop Zone (Tier 1)', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress promotional popup banner from intercepting clicks
    await page.addInitScript(() => {
      try {
        const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
        localStorage.setItem('popupClosedDate', today);
      } catch (e) {}
    });
  });

  test('T03-01: Chat widget is positioned at right edge by default', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const widget = page.locator('.main-widget');
    await expect(widget).toBeVisible();

    const isLeft = await widget.evaluate((el) => el.classList.contains('pc-widget--left'));
    expect(isLeft).toBe(false);

    const toggleBtn = page.locator('#toggle-widget-btn');
    const box = await toggleBtn.boundingBox();
    expect(box).not.toBeNull();
    // Default position at right edge: x + width should be near viewport right (1440)
    expect(box.x + box.width).toBeGreaterThanOrEqual(1300);
  });

  test('T03-02: Small close icon next to robot mascot is removed', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    // Old small dismiss button adjacent to mascot should not exist
    const oldDismissBtn = page.locator('#toggle-widget-btn .pc-widget-dismiss');
    await expect(oldDismissBtn).toHaveCount(0);
  });

  test('T03-03: Drop target zone exists with dimensions >= 44x44px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const dropZone = page.locator('#pc-chat-drop-zone');
    await expect(dropZone).toBeAttached();

    const dropTarget = page.locator('#pc-chat-drop-zone .pc-chat-drop-target');
    await expect(dropTarget).toBeAttached();

    const targetDims = await dropTarget.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        width: parseFloat(style.width),
        height: parseFloat(style.height),
        minWidth: parseFloat(style.minWidth),
        minHeight: parseFloat(style.minHeight),
      };
    });

    expect(targetDims.width).toBeGreaterThanOrEqual(44);
    expect(targetDims.height).toBeGreaterThanOrEqual(44);
  });

  test('T03-04: Clicking footer re-trigger restores hidden chat widget', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const widget = page.locator('.main-widget');
    await expect(widget).toBeVisible();

    // Hide the widget programmatically (simulating drag-to-hide or storage)
    await page.evaluate(() => {
      if (window.pcSetContactHidden) {
        window.pcSetContactHidden(true);
      } else {
        document.querySelector('.main-widget').classList.add('widget-hidden');
      }
    });

    await expect(widget).toHaveClass(/widget-hidden/);

    // Click footer re-trigger via dispatchEvent to reliably bubble click
    const retriggerBtn = page.locator('[data-contact-show]');
    await expect(retriggerBtn).toBeAttached();
    await retriggerBtn.dispatchEvent('click');

    // Widget should now be unhidden
    await expect(widget).not.toHaveClass(/widget-hidden/);
  });

  test('T03-05: Clicking mascot opens and closes the contact panel', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const widget = page.locator('.main-widget');
    const toggleBtn = page.locator('#toggle-widget-btn');

    // Initially not opened
    expect(await widget.evaluate((el) => el.classList.contains('widget-opened'))).toBe(false);

    // Toggle open via dispatchEvent
    await toggleBtn.dispatchEvent('click');
    await expect(widget).toHaveClass(/widget-opened/);

    // Close button inside panel
    const closeBtn = page.locator('.close-widget-btn');
    if (await closeBtn.isVisible()) {
      await closeBtn.dispatchEvent('click');
      await expect(widget).not.toHaveClass(/widget-opened/);
    }
  });
});
