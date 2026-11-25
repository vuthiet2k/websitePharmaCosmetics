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
    collection: '/collections/all',
    brand: '/thuong-hieu',
  };
}

test.describe('T-09: Unified Pagination Boundary & Corner Cases (Tier 2)', () => {
  test('T-09-B01: On page 1, Previous button has disabled state attributes', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const paginationNav = page.locator('nav[aria-label="Phân trang"], nav[aria-label="Phân trang thương hiệu"], nav[data-pc-pagination]').first();
    const prevItem = paginationNav.locator('li:first-child > *');

    const isDisabled = await prevItem.evaluate(el => {
      const comp = window.getComputedStyle(el);
      return (
        el.classList.contains('cursor-not-allowed') ||
        el.classList.contains('opacity-40') ||
        comp.cursor === 'not-allowed' ||
        parseFloat(comp.opacity) <= 0.5 ||
        el.getAttribute('aria-hidden') === 'true'
      );
    });
    expect(isDisabled).toBe(true);
  });

  test('T-09-B02: Breakpoint boundary (1024px tablet) maintains >=44x44px buttons', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(ROUTES.brand);

    const paginationNav = page.locator('nav[aria-label="Phân trang"], nav[aria-label="Phân trang thương hiệu"], nav[data-pc-pagination]').first();
    const buttons = paginationNav.locator('li > a, li > button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const isVisible = await btn.isVisible();
      if (!isVisible) continue;

      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThanOrEqual(43.5);
      expect(box.height).toBeGreaterThanOrEqual(43.5);
    }
  });

  test('T-09-B03: Transitioning to page 2 updates active indicator and activates Previous button', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const paginationNav = page.locator('nav[aria-label="Phân trang"], nav[aria-label="Phân trang thương hiệu"], nav[data-pc-pagination]').first();
    const page2Btn = paginationNav.locator('li > button:has-text("2"), li > a:has-text("2")').first();

    if (await page2Btn.isVisible()) {
      await page2Btn.click();
      await page.waitForTimeout(300);

      const activePage = paginationNav.locator('[aria-current="page"]');
      await expect(activePage).toHaveText('2');

      const prevControl = paginationNav.locator('li:first-child > *');
      const isPrevActive = await prevControl.evaluate(el => {
        return !el.classList.contains('cursor-not-allowed') && el.getAttribute('aria-label') === 'Trang trước';
      });
      expect(isPrevActive).toBe(true);
    }
  });

  test('T-09-B04: Extreme page parameter does not crash the server or break page template', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    const resp = await page.goto(`${ROUTES.collection}?page=9999`);
    expect(resp.status()).toBeLessThan(500);

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('T-09-B05: Large page count displays ellipsis gap separator cleanly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const paginationNav = page.locator('nav[aria-label="Phân trang"], nav[aria-label="Phân trang thương hiệu"], nav[data-pc-pagination]').first();
    const ellipsis = paginationNav.locator('li:has-text("…")');

    if (await ellipsis.count() > 0) {
      const isVisible = await ellipsis.first().isVisible();
      expect(isVisible).toBe(true);
    }
  });

  test('T-09-B06: Ultra-narrow mobile viewport (320px) avoids breaking page layout', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto(ROUTES.brand);

    const paginationNav = page.locator('nav[aria-label="Phân trang"], nav[aria-label="Phân trang thương hiệu"], nav[data-pc-pagination]').first();
    await expect(paginationNav).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
