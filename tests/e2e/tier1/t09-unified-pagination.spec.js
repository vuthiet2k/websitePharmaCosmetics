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

test.describe('T-09: Unified Pagination (Tier 1)', () => {
  test('T-09-01: Pagination container exists with standard aria-label and unified structure', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const paginationNav = page.locator('nav[aria-label="Phân trang"], nav[aria-label="Phân trang thương hiệu"], nav[data-pc-pagination]');
    await expect(paginationNav.first()).toBeVisible();

    const list = paginationNav.locator('ul');
    await expect(list.first()).toBeVisible();
    const items = list.locator('li');
    await expect(await items.count()).toBeGreaterThan(0);
  });

  test('T-09-02: All pagination buttons satisfy minimum 44x44px touch target requirement', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const paginationNav = page.locator('nav[aria-label="Phân trang"], nav[aria-label="Phân trang thương hiệu"], nav[data-pc-pagination]').first();
    const buttons = paginationNav.locator('li > a, li > button, li > span');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const isVisible = await btn.isVisible();
      if (!isVisible) continue;

      const text = (await btn.textContent()).trim();
      if (text === '…') continue;

      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThanOrEqual(43.5);
      expect(box.height).toBeGreaterThanOrEqual(43.5);
    }
  });

  test('T-09-03: Pagination container has centered alignment', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const paginationNav = page.locator('nav[aria-label="Phân trang"], nav[aria-label="Phân trang thương hiệu"], nav[data-pc-pagination]').first();
    const list = paginationNav.locator('ul').first();

    const listClasses = await list.getAttribute('class');
    expect(listClasses).toMatch(/justify-center/);

    const justifyProp = await list.evaluate(el => window.getComputedStyle(el).justifyContent);
    expect(['center', 'safe center']).toContain(justifyProp);
  });

  test('T-09-04: Current active page indicator has brand styling and aria-current="page"', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const paginationNav = page.locator('nav[aria-label="Phân trang"], nav[aria-label="Phân trang thương hiệu"], nav[data-pc-pagination]').first();
    const activeItem = paginationNav.locator('[aria-current="page"]');
    await expect(activeItem).toBeVisible();
    await expect(activeItem).toHaveText('1');

    const styles = await activeItem.evaluate(el => {
      const comp = window.getComputedStyle(el);
      return {
        backgroundColor: comp.backgroundColor,
        color: comp.color,
      };
    });

    const isBrandGreen = styles.backgroundColor.includes('60, 179, 113') || styles.backgroundColor.includes('34, 197, 94') || styles.backgroundColor.includes('16, 185, 129') || styles.backgroundColor.includes('46, 125, 50');
    expect(isBrandGreen).toBeTruthy();
  });

  test('T-09-05: Mobile viewport (390px) keeps pagination intact without horizontal blowout', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.brand);

    const paginationNav = page.locator('nav[aria-label="Phân trang"], nav[aria-label="Phân trang thương hiệu"], nav[data-pc-pagination]').first();
    await expect(paginationNav).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('T-09-06: Navigation controls render Previous/Next with appropriate labels and disabled state', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const paginationNav = page.locator('nav[aria-label="Phân trang"], nav[aria-label="Phân trang thương hiệu"], nav[data-pc-pagination]').first();
    const prevControl = paginationNav.locator('li:first-child > *');
    await expect(prevControl).toBeVisible();

    const isPrevDisabled = await prevControl.evaluate(el => {
      return el.classList.contains('cursor-not-allowed') || el.classList.contains('opacity-40') || el.getAttribute('aria-hidden') === 'true' || el.hasAttribute('disabled');
    });
    expect(isPrevDisabled).toBeTruthy();

    const nextControl = paginationNav.locator('li:last-child > *');
    await expect(nextControl).toBeVisible();
  });
});
