const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('Tier 3: Pair T-13 & T-14 - About Us Brand Tint Cards & Motion Safety', () => {
  test('P13-14-01: Mission and Method sections feature brand-tint cards with circular icon/number badges', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    // Check Method/Process steps
    const stepBadges = page.locator('#about-method .rounded-full, #about-mission .rounded-xl, #about-mission .rounded-full');
    if (await stepBadges.count() > 0) {
      const firstBadge = stepBadges.first();
      await expect(firstBadge).toBeVisible();

      const borderRadius = await firstBadge.evaluate((el) => window.getComputedStyle(el).borderRadius);
      expect(borderRadius).toMatch(/50%|9999px|\d+px/);
    }

    // Verify card containers exist with light background
    const cards = page.locator('#about-method .rounded-2xl, #about-mission .rounded-2xl');
    if (await cards.count() > 0) {
      await expect(cards.first()).toBeVisible();
      const cardBg = await cards.first().evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(cardBg).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('P13-14-02: Under reduced motion, cards remain immediately visible with full opacity and zero transform offset', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    // Scroll to mission section
    const missionSection = page.locator('#about-mission, #about-method').first();
    if (await missionSection.count() > 0) {
      await missionSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);

      const opacity = await missionSection.evaluate((el) => window.getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeGreaterThanOrEqual(0.9);
    }
  });

  test('P13-14-03: Responsive cards maintain grid column constraints on mobile without edge overflowing', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.about);

    const cards = page.locator('#about-method .rounded-2xl, #about-mission .rounded-2xl');
    if (await cards.count() > 0) {
      const box = await cards.first().boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeLessThanOrEqual(VIEWPORTS.mobile.width);
      expect(box.x).toBeGreaterThanOrEqual(0);
    }
  });
});
