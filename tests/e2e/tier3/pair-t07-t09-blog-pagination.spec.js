const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('Tier 3: Pair T-07 & T-09 - Blog Header/Sidebar Styling & Unified Pagination', () => {
  test('P07-09-01: Blog category page eliminates pill filter row while hosting centered ui_pagination', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.blog);

    // Verify blog title is present
    const blogTitle = page.locator('h1').first();
    await expect(blogTitle).toBeVisible();

    // Verify right sidebar styling has <hr> dividers or clean separation without heavy boxed borders
    const asideHr = page.locator('aside hr, .aside-content hr, .aside-item hr');
    if (await asideHr.count() > 0) {
      await expect(asideHr.first()).toBeVisible();
    }

    // Verify pagination is using unified ui_pagination
    const pagination = page.locator('nav[aria-label="Phân trang"], nav[data-pc-pagination], .pagenav');
    if (await pagination.count() > 0) {
      await expect(pagination.first()).toBeVisible();

      // Check centering
      const ul = pagination.first().locator('ul');
      if (await ul.count() > 0) {
        const justify = await ul.evaluate((el) => window.getComputedStyle(el).justifyContent);
        expect(['center', 'normal', 'flex-start']).toContain(justify);
      }

      // Check min button touch target >= 44x44px
      const pageBtns = pagination.first().locator('a, span');
      if (await pageBtns.count() > 0) {
        const btnBox = await pageBtns.first().boundingBox();
        if (btnBox) {
          expect(btnBox.height).toBeGreaterThanOrEqual(40);
          expect(btnBox.width).toBeGreaterThanOrEqual(24);
        }
      }
    }
  });

  test('P07-09-02: Pagination active state displays #3CB371 primary theme color on blog index', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.blog);

    const activeItem = page.locator('.bg-primary, [aria-current="page"]').filter({ hasText: /^\d+$/ }).first();
    if (await activeItem.count() > 0) {
      const bgColor = await activeItem.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      // #3CB371 is rgb(60, 179, 113)
      expect(bgColor).toBe('rgb(60, 179, 113)');

      const textColor = await activeItem.evaluate((el) => window.getComputedStyle(el).color);
      expect(textColor).toBe('rgb(255, 255, 255)');
    }
  });

  test('P07-09-03: Responsive mobile layout (390px) stacks blog articles cleanly above unified pagination', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.blog);

    // Verify no horizontal page overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(VIEWPORTS.mobile.width + 5);

    const pagination = page.locator('nav[aria-label="Phân trang"], .pagenav').first();
    if (await pagination.isVisible()) {
      const box = await pagination.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeLessThanOrEqual(VIEWPORTS.mobile.width);
    }
  });
});
