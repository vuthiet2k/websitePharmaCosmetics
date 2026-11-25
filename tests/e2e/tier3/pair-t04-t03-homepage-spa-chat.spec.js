const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('Tier 3: Pair T-04 & T-03 - Homepage Static Spa Cards & Chat Mascot', () => {
  test('P04-03-01: Homepage #section_spa step cards are static with non-pointer cursor while chat widget is interactive', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home);

    const spaSection = page.locator('#section_spa, section[aria-labelledby="spa-section-title"]').first();
    await expect(spaSection).toBeVisible();

    // Verify step cards have static characteristics
    const stepCards = spaSection.locator('ol li, .grid ol li');
    if (await stepCards.count() > 0) {
      const firstCard = stepCards.first();
      // Should not be wrapped in an <a> tag
      const anchorParent = firstCard.locator('xpath=ancestor-or-self::a');
      expect(await anchorParent.count()).toBe(0);

      // Cursor should be default
      const cursor = await firstCard.evaluate((el) => window.getComputedStyle(el).cursor);
      expect(cursor).not.toBe('pointer');
    }

    // Verify chat widget is present and has pointer cursor on trigger button
    const chatBtn = page.locator('.main-widget #toggle-widget-btn, .main-widget .out-circle').first();
    await expect(chatBtn).toBeVisible();
    const chatCursor = await chatBtn.evaluate((el) => window.getComputedStyle(el).cursor);
    expect(chatCursor).toBe('pointer');
  });

  test('P04-03-02: Left column booking CTA in #section_spa remains unobstructed and clickable alongside chat widget', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home);

    const spaSection = page.locator('#section_spa, section[aria-labelledby="spa-section-title"]').first();
    const bookingCta = spaSection.locator('a[href*="dat-lich"]').first();
    await expect(bookingCta).toBeVisible();

    const ctaBox = await bookingCta.boundingBox();
    const chatWidget = page.locator('.main-widget');
    const chatBox = await chatWidget.boundingBox();

    expect(ctaBox).not.toBeNull();
    expect(chatBox).not.toBeNull();

    // Ensure clear distance between left CTA and right chat widget
    expect(chatBox.x).toBeGreaterThan(ctaBox.x + ctaBox.width);
  });

  test('P04-03-03: Dragging chat mascot near #section_spa does not activate link events or page transitions', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home);

    const currentUrl = page.url();

    const mascot = page.locator('.main-widget #toggle-widget-btn, .main-widget .out-circle').first();
    await expect(mascot).toBeVisible();

    const mascotBox = await mascot.boundingBox();
    expect(mascotBox).not.toBeNull();

    // Simulate drag across 50px
    await page.mouse.move(mascotBox.x + 20, mascotBox.y + 20);
    await page.mouse.down();
    await page.mouse.move(mascotBox.x - 30, mascotBox.y + 10);
    await page.mouse.up();
    await page.waitForTimeout(200);

    // Ensure page stayed on home route
    expect(page.url()).toBe(currentUrl);
  });
});
