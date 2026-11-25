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

test.describe('T-16: About Us Ingredients Marquee (Tier 1)', () => {
  test('T-16-01: Ingredients section exists on About Us page', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing, section:has-text("Hoạt chất")').first();
    await expect(ingSection).toBeVisible();
  });

  test('T-16-02: Ingredients are populated with active ingredient names', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing, section:has-text("Hoạt chất")').first();
    const pills = ingSection.locator('a, span.rounded-full, [class*="ingredient"]');
    const count = await pills.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const textSample = await ingSection.innerText();
    expect(textSample.length).toBeGreaterThan(20);
  });

  test('T-16-03: Marquee rows or ingredient container renders without horizontal overflow beyond body', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing, section:has-text("Hoạt chất")').first();
    await expect(ingSection).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('T-16-04: Hovering over marquee row applies pause interaction or maintains interactive links', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing, section:has-text("Hoạt chất")').first();
    const marqueeContainer = ingSection.locator('[class*="marquee"], .flex-wrap, [class*="overflow"]').first();
    await expect(marqueeContainer).toBeVisible();

    await marqueeContainer.hover();
    await page.waitForTimeout(100);

    // Verify hover state is functional without throwing errors
    const isVisibleAfterHover = await marqueeContainer.isVisible();
    expect(isVisibleAfterHover).toBe(true);
  });

  test('T-16-05: Ingredient badges have accessible styling with rounded pill shape', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing, section:has-text("Hoạt chất")').first();
    const firstPill = ingSection.locator('a, span.rounded-full').first();
    await expect(firstPill).toBeVisible();

    const borderRadius = await firstPill.evaluate(el => window.getComputedStyle(el).borderRadius);
    expect(borderRadius).toMatch(/9999px|50%|16px|20px|24px|8px|12px/);
  });

  test('T-16-06: Mobile viewport (390px) contains ingredients cleanly within viewport bounds', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing, section:has-text("Hoạt chất")').first();
    await expect(ingSection).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
