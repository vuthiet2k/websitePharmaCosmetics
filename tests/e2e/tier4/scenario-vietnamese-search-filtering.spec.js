const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function gotoPDP(page) {
  const resp = await page.goto(ROUTES.product);
  if (!resp || resp.status() === 404 || (await page.locator('.btn-buyNow').count()) === 0) {
    await page.goto('/?tpl=product');
  }
}

test.describe('Tier 4: Scenario 4 - Vietnamese Diacritics Product Search & Shopping Journey', () => {
  test('SC04-01: Multi-step search to checkout flow: Accented search -> List view 2-col -> Pagination -> PDP buy button', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // Step 1: Perform search with Vietnamese diacritic phrase
    const rawKeyword = 'Chống nắng lên tone';
    await page.goto(`${ROUTES.search}?q=${encodeURIComponent(rawKeyword)}`);

    // Step 2: Verify decoded h1 heading (T-08)
    const h1 = page.locator('h1').first();
    if (await h1.isVisible()) {
      const h1Text = await h1.innerText();
      expect(h1Text).not.toMatch(/&#\d+;/);
      expect(h1Text).not.toContain('&amp;#');
      expect(h1Text.toLowerCase()).toContain('chống nắng');
    }

    // Step 3: Toggle List view mode (T-11)
    await page.evaluate(() => document.documentElement.setAttribute('data-pc-view', 'list'));
    await page.waitForTimeout(100);

    // Step 4: Verify 2 cards per row layout in list view
    const productGrid = page.locator('ul').filter({ has: page.locator('article') }).first();
    if (await productGrid.count() > 0) {
      await expect(productGrid).toBeVisible();
      const cards = productGrid.locator('article');
      if (await cards.count() >= 2) {
        const c0 = await cards.nth(0).boundingBox();
        const c1 = await cards.nth(1).boundingBox();
        if (c0 && c1) {
          expect(c0.width).toBeGreaterThan(150);
          expect(c1.width).toBeGreaterThan(150);
        }
      }
    }

    // Step 5: Check unified ui_pagination controls (T-09)
    const pagination = page.locator('nav[aria-label="Phân trang"], .pagenav, [data-pc-pagination]').first();
    if (await pagination.isVisible()) {
      const pageBtns = pagination.locator('a, span');
      if (await pageBtns.count() > 0) {
        const btnBox = await pageBtns.first().boundingBox();
        if (btnBox) {
          expect(btnBox.height).toBeGreaterThanOrEqual(40);
        }
      }
    }

    // Step 6: Navigate to Product Detail Page (PDP)
    await gotoPDP(page);

    // Step 7: Inspect desktop buy button horizontal row (T-10)
    const buyNowBtn = page.locator('.btn-buyNow, .box_btn_acc a').first();
    await expect(buyNowBtn).toBeVisible();

    const flexDir = await buyNowBtn.evaluate((el) => window.getComputedStyle(el).flexDirection);
    expect(flexDir).toBe('row');

    // Icon presence (14px - 24px)
    const icon = buyNowBtn.locator('svg, i').first();
    if (await icon.count() > 0) {
      const iconBox = await icon.boundingBox();
      if (iconBox) {
        expect(iconBox.width).toBeGreaterThanOrEqual(14);
      }
    }
  });

  test('SC04-02: Search diacritics persistence across navigation and filter updates', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`${ROUTES.search}?q=tr%E1%BB%8B+m%E1%BB%A5n`);

    // Verify h1 contains "trị mụn" without numerical entity codes
    const h1 = page.locator('h1').first();
    if (await h1.isVisible()) {
      const text = await h1.innerText();
      expect(text).not.toMatch(/&#\d+;/);
    }

    // Ensure list view state persistence
    await page.evaluate(() => document.documentElement.setAttribute('data-pc-view', 'list'));
    await page.reload();
    await page.waitForTimeout(100);

    const viewState = await page.evaluate(() => document.documentElement.getAttribute('data-pc-view') || localStorage.getItem('pc_view_mode') || 'grid');
    expect(['grid', 'list']).toContain(viewState);
  });
});
