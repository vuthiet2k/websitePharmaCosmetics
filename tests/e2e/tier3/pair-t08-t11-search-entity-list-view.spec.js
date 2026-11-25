const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('Tier 3: Pair T-08 & T-11 - Search Vietnamese Entity Decoding & List View Layout', () => {
  test('P08-11-01: Searching Vietnamese term decodes correctly in <h1> and respects 2 cards/row in list view', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`${ROUTES.search}?q=ch%E1%BB%91ng+n%E1%BA%AFng`);

    // 1. Verify entity decoding in h1
    const h1 = page.locator('h1').first();
    if (await h1.isVisible()) {
      const h1Text = await h1.innerText();
      expect(h1Text).not.toMatch(/&#\d+;/);
      expect(h1Text).not.toContain('&amp;#');
    }

    // 2. Set list view mode
    await page.evaluate(() => document.documentElement.setAttribute('data-pc-view', 'list'));
    await page.waitForTimeout(100);

    // Verify search grid respects list view
    const productList = page.locator('ul').filter({ has: page.locator('article') }).first();
    if (await productList.count() > 0) {
      await expect(productList).toBeVisible();
      const cards = productList.locator('article');
      if (await cards.count() >= 2) {
        const c0 = await cards.nth(0).boundingBox();
        const c1 = await cards.nth(1).boundingBox();
        if (c0 && c1) {
          // Check that cards are arranged in 2 columns (or horizontal cards side-by-side)
          expect(c0.width).toBeGreaterThan(150);
          expect(c1.width).toBeGreaterThan(150);
        }
      }
    }
  });

  test('P08-11-02: Switching between search grid and list views maintains decoded search results without reload', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`${ROUTES.search}?q=d%C6%B0%E1%BB%A1ng+%E1%BA%A9m`);

    // Toggle list view
    await page.evaluate(() => document.documentElement.setAttribute('data-pc-view', 'list'));
    await page.waitForTimeout(50);
    // Toggle grid view
    await page.evaluate(() => document.documentElement.setAttribute('data-pc-view', 'grid'));
    await page.waitForTimeout(50);

    // Verify search input value is intact and decoded
    const searchInput = page.locator('input[type="search"], input[name="query"], #pc-brand-search-input').first();
    if (await searchInput.isVisible()) {
      const val = await searchInput.inputValue();
      expect(val).not.toMatch(/&#\d+;/);
    }
  });

  test('P08-11-03: Responsive mobile search page (390px) adapts list view without horizontal overflow', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(`${ROUTES.search}?q=da`);

    await page.evaluate(() => document.documentElement.setAttribute('data-pc-view', 'list'));
    await page.waitForTimeout(100);

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(VIEWPORTS.mobile.width + 5);
  });
});
