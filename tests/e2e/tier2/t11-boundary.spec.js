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
    search: '/search',
  };
}

test.describe('T-11: Product Grid List View Boundary & Corner Cases (Tier 2)', () => {
  test('T-11-B01: Tablet viewport (1024px) retains readable card layout in List view', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(ROUTES.collection);

    const listBtn = page.locator('button[data-pc-view="list"], .pc-view-toggle__btn[data-pc-view="list"]');
    if (await listBtn.isVisible()) {
      await listBtn.click();
      const productGrid = page.locator('ul[class*="grid"], .products-view-grid, .product-grid').first();
      await expect(productGrid).toBeVisible();

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    }
  });

  test('T-11-B02: Rapid toggling between Grid and List view maintains stable DOM state', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.collection);

    const gridBtn = page.locator('button[data-pc-view="grid"], .pc-view-toggle__btn[data-pc-view="grid"]');
    const listBtn = page.locator('button[data-pc-view="list"], .pc-view-toggle__btn[data-pc-view="list"]');

    for (let i = 0; i < 5; i++) {
      await listBtn.click();
      await gridBtn.click();
    }

    // Final click to list
    await listBtn.click();
    expect(await page.locator('html').getAttribute('data-pc-view')).toBe('list');
    await expect(listBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(gridBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('T-11-B03: Search page supports list view toggle consistently', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`${ROUTES.search}?q=kem`);

    const listBtn = page.locator('button[data-pc-view="list"], .pc-view-toggle__btn[data-pc-view="list"]');
    if (await listBtn.isVisible()) {
      await listBtn.click();
      expect(await page.locator('html').getAttribute('data-pc-view')).toBe('list');
    }
  });

  test('T-11-B04: Trailing odd product in 2-card row layout does not break container alignment', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.collection);

    const listBtn = page.locator('button[data-pc-view="list"], .pc-view-toggle__btn[data-pc-view="list"]');
    await listBtn.click();

    const productGrid = page.locator('ul[class*="grid"], .products-view-grid, .product-grid').first();
    const cards = productGrid.locator('li');
    const count = await cards.count();

    if (count > 0) {
      const lastCard = cards.last();
      await expect(lastCard).toBeVisible();
      const lastBox = await lastCard.boundingBox();
      expect(lastBox).not.toBeNull();
      expect(lastBox.width).toBeGreaterThan(0);
    }
  });

  test('T-11-B05: Mobile viewport (390px) hides desktop toggle buttons as expected by UI standard', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.collection);

    const toggleBtns = page.locator('.pc-view-toggle__btn, button[data-pc-view]');
    const count = await toggleBtns.count();

    for (let i = 0; i < count; i++) {
      const btn = toggleBtns.nth(i);
      const isVisible = await btn.isVisible();
      const hasHiddenClass = await btn.evaluate(el => {
        const comp = window.getComputedStyle(el);
        return comp.display === 'none' || el.classList.contains('max-[991px]:hidden') || el.classList.contains('hidden');
      });
      expect(!isVisible || hasHiddenClass).toBe(true);
    }
  });

  test('T-11-B06: Viewport transition across 991px threshold adapts view toggle visibility smoothly', async ({ page }) => {
    // 991px (mobile breakpoint cutoff)
    await page.setViewportSize({ width: 991, height: 700 });
    await page.goto(ROUTES.collection);

    // 992px (desktop layout threshold)
    await page.setViewportSize({ width: 992, height: 700 });
    const listBtn = page.locator('button[data-pc-view="list"], .pc-view-toggle__btn[data-pc-view="list"]');
    if (await listBtn.count() > 0) {
      const isVisible = await listBtn.first().isVisible();
      expect(isVisible).toBe(true);
    }
  });
});
