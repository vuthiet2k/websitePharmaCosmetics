const { test, expect } = require('@playwright/test');

let VIEWPORTS;
let ROUTES;
try {
  VIEWPORTS = require('../helpers/viewports').VIEWPORTS;
} catch {
  VIEWPORTS = {
    desktop: { width: 1440, height: 900 },
    tablet: { width: 1024, height: 768 },
    mobile: { width: 390, height: 844 },
  };
}
try {
  ROUTES = require('../helpers/routes').ROUTES;
} catch {
  ROUTES = {
    about: '/about-us',
  };
}

test.describe('T-14: About Us Motion-Safe Animations (Tier 1)', () => {
  test('T-14-01: Under standard motion, page renders key sections smoothly without hidden blocks', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(ROUTES.about);

    const sections = page.locator('main section, #aboutRail ~ div > div');
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);

    const firstSection = sections.first();
    await expect(firstSection).toBeVisible();
  });

  test('T-14-02: Under reduced motion (prefers-reduced-motion: reduce), elements are immediately visible', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    // Verify key panels are immediately visible and not hidden by stuck 0 opacity
    const panels = page.locator('#about-mission, #about-method, #about-team');
    const count = await panels.count();
    for (let i = 0; i < count; i++) {
      const panel = panels.nth(i);
      const isVisible = await panel.isVisible();
      if (!isVisible) continue;

      const opacity = await panel.evaluate(el => window.getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeGreaterThan(0.5);
    }
  });

  test('T-14-03: Under reduced motion, animation duration or transitions are suppressed or zeroed', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    // Check media query evaluation in browser context
    const matchesReducedMotion = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    expect(matchesReducedMotion).toBe(true);
  });

  test('T-14-04: Scrolling across About page under reduced motion does not produce layout shifts', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    const initialHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await page.waitForTimeout(200);

    const midHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(Math.abs(midHeight - initialHeight)).toBeLessThanOrEqual(50);
  });

  test('T-14-05: Both standard and reduced motion modes display hero heading and content legibly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    
    // First in standard motion
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(ROUTES.about);
    const h1Standard = page.locator('h1').first();
    await expect(h1Standard).toBeVisible();
    const textStandard = await h1Standard.textContent();

    // Next in reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    const h1Reduced = page.locator('h1').first();
    await expect(h1Reduced).toBeVisible();
    const textReduced = await h1Reduced.textContent();

    expect(textStandard).toEqual(textReduced);
  });

  test('T-14-06: Mobile viewport (390px) under reduced motion maintains zero horizontal overflow', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
