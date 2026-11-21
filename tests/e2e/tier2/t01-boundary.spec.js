const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-01: Service Page Spacing Boundary and Stress (Tier 2)', () => {
  const serviceRoute = ROUTES.servicesPopulated || ROUTES.services;

  test('T01-B01: Extreme widescreen resolution (1920x1080) padding bounds', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(ROUTES.services);

    const introSection = page.locator('.lt-intro--collection');
    await expect(introSection).toBeVisible();

    const padTop = await introSection.evaluate((el) => parseFloat(window.getComputedStyle(el).paddingTop));
    const padBottom = await introSection.evaluate((el) => parseFloat(window.getComputedStyle(el).paddingBottom));

    // Even on 1920px widescreen, compact padding must not exceed 40px
    expect(padTop).toBeLessThanOrEqual(40);
    expect(padBottom).toBeLessThanOrEqual(40);
  });

  test('T01-B02: Ultra-compact mobile resolution (320x568) horizontal overflow check', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(ROUTES.services);

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test('T01-B03: Dynamic responsive resize recalculates padding immediately', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.services);

    const intro = page.locator('.lt-intro--collection');
    const desktopPad = await intro.evaluate((el) => parseFloat(window.getComputedStyle(el).paddingTop));

    // Shrink to mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(150);
    const mobilePad = await intro.evaluate((el) => parseFloat(window.getComputedStyle(el).paddingTop));

    expect(mobilePad).toBeLessThanOrEqual(desktopPad);

    // Expand back to desktop
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(150);
    const restoredPad = await intro.evaluate((el) => parseFloat(window.getComputedStyle(el).paddingTop));

    expect(restoredPad).toBe(desktopPad);
  });

  test('T01-B04: Consecutive service sections do not compound excess vertical spacing', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(serviceRoute);

    const sections = page.locator('.lt-section');
    const count = await sections.count();

    if (count >= 2) {
      const box1 = await sections.nth(0).boundingBox();
      const box2 = await sections.nth(1).boundingBox();
      if (box1 && box2) {
        const gap = box2.y - (box1.y + box1.height);
        // Margin between sections should be 0 or small (sections use padding, not huge margins)
        expect(gap).toBeLessThanOrEqual(48);
      }
    }
  });

  test('T01-B05: Long title in service card does not overflow card boundary', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(serviceRoute);

    const firstCard = page.locator('.lt-card').first();
    await expect(firstCard).toBeVisible();

    const cardBox = await firstCard.boundingBox();
    const actions = firstCard.locator('.lt-pcard__actions');
    const actionsBox = await actions.boundingBox();

    if (cardBox && actionsBox) {
      // Actions must sit strictly within the card's bounding box
      expect(actionsBox.y + actionsBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height + 2);
    }
  });
});
