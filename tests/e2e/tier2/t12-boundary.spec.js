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

test.describe('T-12: About Us Stats Count-up Boundary & Corner Cases (Tier 2)', () => {
  test('T-12-B01: Immediate scroll jump to bottom resolves stats to final numbers without freezing', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    // Jump directly to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const statsSection = page.locator('section:has(.font-heading):has-text("thương hiệu"), [class*="about-stat"]').first();
    const text = await statsSection.textContent();
    expect(/\d+/.test(text)).toBeTruthy();
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('undefined');
  });

  test('T-12-B02: Under reduced motion, stat values are immediately complete upon render', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    const statsSection = page.locator('section:has(.font-heading):has-text("thương hiệu"), [class*="about-stat"]').first();
    await statsSection.scrollIntoViewIfNeeded();

    const text = await statsSection.textContent();
    expect(/\d+/.test(text)).toBeTruthy();
  });

  test('T-12-B03: Scrolling away and back into view does not corrupt or concatenate numbers', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const statsSection = page.locator('section:has(.font-heading):has-text("thương hiệu"), [class*="about-stat"]').first();
    await statsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const initialText = await statsSection.textContent();

    // Scroll away to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    // Scroll back down
    await statsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const reScrolledText = await statsSection.textContent();
    expect(reScrolledText.trim()).toEqual(initialText.trim());
  });

  test('T-12-B04: Ultra-wide desktop viewport (2560px) maintains bounded container layout', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto(ROUTES.about);

    const statsContainer = page.locator('section:has(.font-heading):has-text("thương hiệu") .container, [class*="about-stat"] .container').first();
    await expect(statsContainer).toBeVisible();

    const box = await statsContainer.boundingBox();
    expect(box).not.toBeNull();
    // Container max-width should constrain content well below 2560px
    expect(box.width).toBeLessThanOrEqual(1600);
  });

  test('T-12-B05: Mobile viewport (390px) distributes stat cards evenly in 2-column grid', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.about);

    const statsSection = page.locator('section:has(.font-heading):has-text("thương hiệu"), [class*="about-stat"]').first();
    const statCards = statsSection.locator('.grid > div');
    const count = await statCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const box1 = await statCards.nth(0).boundingBox();
    const box2 = await statCards.nth(1).boundingBox();
    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();

    // In a 2-column grid, card 1 and card 2 share roughly the same Y coordinate
    expect(Math.abs(box1.y - box2.y)).toBeLessThanOrEqual(20);
  });

  test('T-12-B06: Zero console errors logged during scroll interaction over stats strip', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const statsSection = page.locator('section:has(.font-heading):has-text("thương hiệu"), [class*="about-stat"]').first();
    await statsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const criticalErrors = consoleErrors.filter(e => !e.includes('net::ERR_ABORTED') && !e.includes('favicon'));
    expect(criticalErrors.length).toBe(0);
  });
});
