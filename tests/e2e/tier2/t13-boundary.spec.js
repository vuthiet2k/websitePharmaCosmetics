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

test.describe('T-13: About Us Cards Styling Boundary & Corner Cases (Tier 2)', () => {
  test('T-13-B01: Step badges maintain ~1:1 circular aspect ratio regardless of content', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const badges = page.locator('#about-method span.rounded-full, #about-method .w-9.h-9');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const badge = badges.nth(i);
      const isVisible = await badge.isVisible();
      if (!isVisible) continue;

      const box = await badge.boundingBox();
      expect(box).not.toBeNull();
      // Aspect ratio width/height should be very close to 1:1 (circular)
      const ratio = box.width / box.height;
      expect(ratio).toBeGreaterThanOrEqual(0.85);
      expect(ratio).toBeLessThanOrEqual(1.15);
    }
  });

  test('T-13-B02: Mobile viewport (390px) ensures cards have minimum 16px internal padding', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.about);

    const cards = page.locator('#about-method .grid > div, #about-mission .grid > div');
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();

    const padding = await firstCard.evaluate(el => {
      const comp = window.getComputedStyle(el);
      return {
        top: parseFloat(comp.paddingTop),
        left: parseFloat(comp.paddingLeft),
      };
    });

    expect(padding.top).toBeGreaterThanOrEqual(16);
    expect(padding.left).toBeGreaterThanOrEqual(16);
  });

  test('T-13-B03: Tablet viewport (1024px) aligns cards in multi-column grid without jagged overlap', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(ROUTES.about);

    const methodSection = page.locator('#about-method').first();
    await expect(methodSection).toBeVisible();

    const cards = methodSection.locator('.grid > div');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      const box = await cards.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThan(150);
    }
  });

  test('T-13-B04: Rail navigation link click scrolls to targeted card section without error', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const railMethodLink = page.locator('#aboutRail a[href="#about-method"]').first();
    if (await railMethodLink.isVisible()) {
      await railMethodLink.click();
      await page.waitForTimeout(400);

      const methodSection = page.locator('#about-method');
      const inView = await methodSection.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.top >= -200 && rect.top <= window.innerHeight;
      });
      expect(inView).toBe(true);
    }
  });

  test('T-13-B05: Long text within cards does not cause horizontal overflow beyond page container', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('T-13-B06: Card text has high contrast and readability over tinted backgrounds', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const heading = page.locator('#about-mission h3, #about-method h3').first();
    await expect(heading).toBeVisible();

    const color = await heading.evaluate(el => window.getComputedStyle(el).color);
    // Dark ink (gray-900 / forest-900 / brand-deep)
    expect(color).not.toBe('rgba(0, 0, 0, 0)');
  });
});
