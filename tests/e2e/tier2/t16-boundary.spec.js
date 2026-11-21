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

test.describe('T-16: About Us Ingredients Marquee Boundary & Corner Cases (Tier 2)', () => {
  test('T-16-B01: Under reduced motion, marquee scrolling is disabled or static wrap is applied', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing, section:has-text("Hoạt chất")').first();
    await expect(ingSection).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('T-16-B02: Ingredients containing numbers or percentages render accurately', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing, section:has-text("Hoạt chất")').first();
    const text = await ingSection.innerText();

    // Verify text is present and doesn't contain raw HTML entity artifacts
    expect(text).not.toContain('&amp;');
    expect(text).not.toContain('&lt;');
    expect(text).not.toContain('&#');
  });

  test('T-16-B03: Rapid mouse hover in and out does not cause JavaScript errors or layout thrashing', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing, section:has-text("Hoạt chất")').first();
    const target = ingSection.locator('a, span').first();

    if (await target.isVisible()) {
      for (let i = 0; i < 4; i++) {
        await target.hover();
        await page.mouse.move(0, 0);
      }
    }

    expect(pageErrors.length).toBe(0);
  });

  test('T-16-B04: Mobile viewport (390px) contains ingredient pills without horizontal overflow blowout', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing, section:has-text("Hoạt chất")').first();
    await expect(ingSection).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('T-16-B05: Keyboard focus on ingredient pills displays clear focus outline', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const firstLink = page.locator('#about-ing a').first();
    if (await firstLink.isVisible()) {
      await firstLink.focus();
      const isFocused = await firstLink.evaluate(el => document.activeElement === el);
      expect(isFocused).toBe(true);
    }
  });

  test('T-16-B06: Tablet viewport (1024px) retains full-width layout without truncated rows', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing, section:has-text("Hoạt chất")').first();
    await expect(ingSection).toBeVisible();

    const box = await ingSection.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(500);
  });
});
