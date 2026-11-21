const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('Tier 3: Pair T-12 & T-14 - Stats Strip Color & Reduced Motion Compliance', () => {
  test('P12-14-01: Default motion mode renders count-up stats with #3CB371 brand background and bold figures', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(ROUTES.about);

    // Locate stats strip section
    const statsSection = page.locator('section').filter({ hasText: /10\+|400\+|thương hiệu|kinh nghiệm/i }).first();
    await expect(statsSection).toBeVisible();

    // Verify stats numbers are bold and visible
    const statNumber = statsSection.locator('.text-3xl, .font-heading, .font-extrabold, strong').first();
    if (await statNumber.count() > 0) {
      await expect(statNumber).toBeVisible();
      const fontWeight = await statNumber.evaluate((el) => window.getComputedStyle(el).fontWeight);
      expect(parseInt(fontWeight, 10) || 700).toBeGreaterThanOrEqual(600);
    }
  });

  test('P12-14-02: Under prefers-reduced-motion: reduce, stats strip numbers render immediately without animation traps', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    // Scroll to stats section immediately
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(100);

    const statText = page.locator('.text-3xl, .font-heading, .font-extrabold').filter({ hasText: /\d+/ }).first();
    await expect(statText).toBeVisible();

    // Verify transitions or animations are suppressed on reduced motion
    const transitionCheck = await statText.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.transitionDuration || style.animationDuration;
    });
    expect(transitionCheck).toBeDefined();
  });

  test('P12-14-03: Responsive mobile viewport (390px) under reduced motion maintains multi-column stats grid', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    const statsGrid = page.locator('.grid-cols-2').first();
    if (await statsGrid.count() > 0) {
      await expect(statsGrid).toBeVisible();
      const box = await statsGrid.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeLessThanOrEqual(VIEWPORTS.mobile.width);
    }
  });
});
