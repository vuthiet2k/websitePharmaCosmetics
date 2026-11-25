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

test.describe('T-14: About Us Motion-Safe Boundary & Corner Cases (Tier 2)', () => {
  test('T-14-B01: Dynamically switching reduced motion at runtime does not glitch layout', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(ROUTES.about);

    // Switch to reduced motion dynamically
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(200);

    const main = page.locator('main, section').first();
    await expect(main).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('T-14-B02: Direct deep link with anchor hash loads section immediately visible under reduced motion', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${ROUTES.about}#about-method`);
    await page.waitForTimeout(300);

    const methodSection = page.locator('#about-method');
    await expect(methodSection).toBeVisible();

    const opacity = await methodSection.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0.5);
  });

  test('T-14-B03: Rapid full-page scroll does not leave animated cards stuck at zero opacity', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    // Fling scroll to bottom then back to middle
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(200);

    const cards = page.locator('#about-method .grid > div, #about-team .grid > div');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const isVisible = await card.isVisible();
      if (!isVisible) continue;

      const opacity = await card.evaluate(el => window.getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeGreaterThan(0.5);
    }
  });

  test('T-14-B04: Nested badges and icons remain fully visible under reduced motion', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    const badges = page.locator('#about-method span.rounded-full, #about-lab span');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);

    const firstBadge = badges.first();
    await expect(firstBadge).toBeVisible();
    const opacity = await firstBadge.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0.8);
  });

  test('T-14-B05: Mobile viewport (390px) under reduced motion maintains accessible vertical flow', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    const panels = page.locator('#about-mission, #about-method, #about-team');
    const count = await panels.count();
    for (let i = 0; i < count; i++) {
      await expect(panels.nth(i)).toBeVisible();
    }
  });

  test('T-14-B06: No unhandled animation frame or transition exceptions thrown', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    expect(pageErrors.length).toBe(0);
  });
});
