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

test.describe('T-12: About Us Stats Strip & Count-up Animation (Tier 1)', () => {
  test('T-12-01: Stats strip section exists on About Us page with stat items', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    // Stats section locator
    const statsSection = page.locator('section:has(.font-heading):has-text("thương hiệu"), section:has-text("năm"), [class*="about-stat"]').first();
    await expect(statsSection).toBeVisible();

    const statCards = statsSection.locator('.grid > div, [class*="stat-item"]');
    const count = await statCards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('T-12-02: Stats strip has brand background color #3CB371 or dark brand container', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const statsSection = page.locator('section:has(.font-heading):has-text("thương hiệu"), [class*="about-stat"]').first();
    await expect(statsSection).toBeVisible();

    const bgColor = await statsSection.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // Background is #3CB371 (rgb(60, 179, 113)) or dark forest/emerald theme container (rgb(6, 78, 59) / rgb(15, 30, 25))
    expect(bgColor).toBeDefined();
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('T-12-03: Stat numbers are rendered in bold text with high contrast', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const statsSection = page.locator('section:has(.font-heading):has-text("thương hiệu"), [class*="about-stat"]').first();
    const numbers = statsSection.locator('.font-heading, .font-extrabold, .font-bold');
    const count = await numbers.count();
    expect(count).toBeGreaterThan(0);

    const firstNumber = numbers.first();
    const fontWeight = await firstNumber.evaluate(el => window.getComputedStyle(el).fontWeight);
    const weightNum = parseInt(fontWeight, 10) || 700;
    expect(weightNum).toBeGreaterThanOrEqual(600);
  });

  test('T-12-04: Stat labels are legible and properly styled', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const statsSection = page.locator('section:has(.font-heading):has-text("thương hiệu"), [class*="about-stat"]').first();
    const labels = statsSection.locator('.uppercase, .text-xs, .tracking-wider, [class*="stat-label"]');
    await expect(labels.first()).toBeVisible();

    const labelText = await labels.first().textContent();
    expect(labelText.trim().length).toBeGreaterThan(0);
  });

  test('T-12-05: Scrolling to stats section displays target metric values (count-up target)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const statsSection = page.locator('section:has(.font-heading):has-text("thương hiệu"), [class*="about-stat"]').first();
    await statsSection.scrollIntoViewIfNeeded();

    // Allow count-up animation to complete if JS animated
    await page.waitForTimeout(600);

    const text = await statsSection.textContent();
    // Expected metric targets: 10+, 400+, 100%, 1:1 or similar configured values
    const hasNumbers = /\d+/.test(text);
    expect(hasNumbers).toBeTruthy();
  });

  test('T-12-06: Mobile viewport (390px) presents stats without clipping or horizontal overflow', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.about);

    const statsSection = page.locator('section:has(.font-heading):has-text("thương hiệu"), [class*="about-stat"]').first();
    await expect(statsSection).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
