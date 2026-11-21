const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('Tier 3: Pair T-03 & T-12 - Chat Mascot & Stats Banner Layering', () => {
  test('P03-12-01: Chat widget z-index stacks strictly above About-Us stats section without clipping on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const chatWidget = page.locator('.main-widget');
    await expect(chatWidget).toBeVisible();

    // Verify chat widget high z-index stacking
    const chatZIndex = await chatWidget.evaluate((el) => {
      const z = window.getComputedStyle(el).zIndex;
      return parseInt(z, 10) || 0;
    });
    expect(chatZIndex).toBeGreaterThanOrEqual(100);

    // Locate stats section on about page
    const statsSection = page.locator('section').filter({ hasText: /10\+|400\+|thương hiệu|kinh nghiệm/i }).first();
    if (await statsSection.count() > 0) {
      const statsZIndex = await statsSection.evaluate((el) => {
        const z = window.getComputedStyle(el).zIndex;
        return z === 'auto' ? 0 : (parseInt(z, 10) || 0);
      });
      expect(chatZIndex).toBeGreaterThan(statsZIndex);
    }
  });

  test('P03-12-02: Scrolling through stats banner preserves fixed floating position of chat mascot', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const chatWidget = page.locator('.main-widget');
    await expect(chatWidget).toBeVisible();

    const initialPos = await chatWidget.boundingBox();
    expect(initialPos).not.toBeNull();

    // Scroll down 600px into stats / middle content
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(200);

    const scrolledPos = await chatWidget.boundingBox();
    expect(scrolledPos).not.toBeNull();

    // Position relative to viewport should remain fixed (within 20px variance for CSS transforms)
    expect(Math.abs(scrolledPos.y - initialPos.y)).toBeLessThanOrEqual(25);
    expect(Math.abs(scrolledPos.x - initialPos.x)).toBeLessThanOrEqual(15);
  });

  test('P03-12-03: Dragging or toggling chat panel does not interfere with stats count-up presentation', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const chatBtn = page.locator('.main-widget #toggle-widget-btn, .main-widget .out-circle').first();
    await expect(chatBtn).toBeVisible();

    // Click to toggle panel
    await chatBtn.click();
    await page.waitForTimeout(200);

    const content = page.locator('.main-widget .def-content');
    if (await content.count() > 0) {
      await expect(content).toBeVisible();
    }

    // Close panel
    const closeBtn = page.locator('.main-widget .close-widget-btn').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(200);
    }

    // Verify stats numbers are intact and visible
    const statItem = page.locator('.text-3xl.font-extrabold, .font-heading').filter({ hasText: /\d+/ }).first();
    await expect(statItem).toBeVisible();
  });
});
