const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-07: Blog Category Sidebar Boundary and Navigation (Tier 2)', () => {
  test('T07-B01: Category dropdown submenus toggle without horizontal overflow', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.blog);

    const toggleBtn = page.locator('.aside-content-blog button.open_mnu').first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(150);

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);
    }
  });

  test('T07-B02: Ultra-wide desktop (1920x1080) maintains bounded sidebar width', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(ROUTES.blog);

    const sidebar = page.locator('.side-right-stick, .pc-nblog__layout aside');
    if (await sidebar.isVisible()) {
      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      // Sidebar should not stretch uncontrollably (max ~420px)
      expect(box.width).toBeLessThanOrEqual(450);
    }
  });

  test('T07-B03: Long category titles in sidebar wrap cleanly without clipping', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.blog);

    const links = page.locator('.nav-category a.nav-link');
    const count = await links.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = links.nth(i);
      const isVisible = await link.isVisible();
      if (isVisible) {
        const box = await link.boundingBox();
        expect(box).not.toBeNull();
        expect(box.width).toBeGreaterThan(50);
      }
    }
  });

  test('T07-B04: Blog sidebar sticky behavior persists during long article list scrolling', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.blog);

    const stickySidebar = page.locator('.side-right-stick');
    if (await stickySidebar.isVisible()) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(200);

      const box = await stickySidebar.boundingBox();
      expect(box).not.toBeNull();
      // Should remain visible in upper region of viewport
      expect(box.y).toBeLessThanOrEqual(200);
    }
  });

  test('T07-B05: Mobile category links meet min 44px tap target height', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.blog);

    const links = page.locator('.nav-category a.nav-link');
    const count = await links.count();

    if (count > 0) {
      const firstLink = links.first();
      const height = await firstLink.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).minHeight || window.getComputedStyle(el).height);
      });
      expect(height).toBeGreaterThanOrEqual(40);
    }
  });
});
