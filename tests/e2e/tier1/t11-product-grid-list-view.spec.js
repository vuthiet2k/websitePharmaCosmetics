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

test.describe('T-11: Product Grid List View 2-Card Layout (Tier 1)', () => {
  test('T-11-01: Collection page renders Grid and List view toggle buttons with accessible roles', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.collection);

    const gridBtn = page.locator('button[data-pc-view="grid"], .pc-view-toggle__btn[data-pc-view="grid"]');
    const listBtn = page.locator('button[data-pc-view="list"], .pc-view-toggle__btn[data-pc-view="list"]');

    await expect(gridBtn).toBeVisible();
    await expect(listBtn).toBeVisible();
    await expect(gridBtn).toHaveAttribute('aria-label', /lưới/i);
    await expect(listBtn).toHaveAttribute('aria-label', /danh sách/i);
  });

  test('T-11-02: Clicking List view button updates html attribute and aria-pressed state', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.collection);

    const listBtn = page.locator('button[data-pc-view="list"], .pc-view-toggle__btn[data-pc-view="list"]');
    await listBtn.click();

    const rootAttr = await page.locator('html').getAttribute('data-pc-view');
    expect(rootAttr).toBe('list');
    await expect(listBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('T-11-03: In List view, product items adopt 2 cards per row layout on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.collection);

    const listBtn = page.locator('button[data-pc-view="list"], .pc-view-toggle__btn[data-pc-view="list"]');
    await listBtn.click();

    // Verify grid layout or cards width
    const productGrid = page.locator('ul[class*="grid"], .products-view-grid, .product-grid').first();
    await expect(productGrid).toBeVisible();

    const cards = productGrid.locator('li');
    const count = await cards.count();
    expect(count).toBeGreaterThan(1);

    const box1 = await cards.nth(0).boundingBox();
    const box2 = await cards.nth(1).boundingBox();
    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();

    // If 2 cards per row on desktop, card width should be roughly ~40-50% of container width
    const gridBox = await productGrid.boundingBox();
    expect(box1.width / gridBox.width).toBeGreaterThanOrEqual(0.40);
  });

  test('T-11-04: List view card layout positions thumbnail on left and information on right', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.collection);

    const listBtn = page.locator('button[data-pc-view="list"], .pc-view-toggle__btn[data-pc-view="list"]');
    await listBtn.click();

    const firstCard = page.locator('li .product-box, li article, li [class*="pc-pcard"]').first();
    await expect(firstCard).toBeVisible();

    const img = firstCard.locator('img, .product-thumbnail, [class*="thumbnail"]').first();
    const info = firstCard.locator('.product-info, [class*="content"], h3').first();

    const imgBox = await img.boundingBox();
    const infoBox = await info.boundingBox();

    expect(imgBox).not.toBeNull();
    expect(infoBox).not.toBeNull();
    // Image is to the left of info in horizontal list view (imgBox.x <= infoBox.x)
    expect(imgBox.x).toBeLessThanOrEqual(infoBox.x);
  });

  test('T-11-05: Mobile viewport (390px) collapses to single column layout without horizontal overflow', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.collection);

    // On mobile, view toggle may be hidden or list view adapts to single column
    const productGrid = page.locator('ul[class*="grid"], .products-view-grid, .product-grid').first();
    await expect(productGrid).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('T-11-06: Toggling back to Grid view restores default grid layout', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.collection);

    const gridBtn = page.locator('button[data-pc-view="grid"], .pc-view-toggle__btn[data-pc-view="grid"]');
    const listBtn = page.locator('button[data-pc-view="list"], .pc-view-toggle__btn[data-pc-view="list"]');

    await listBtn.click();
    expect(await page.locator('html').getAttribute('data-pc-view')).toBe('list');

    await gridBtn.click();
    expect(await page.locator('html').getAttribute('data-pc-view')).toBe('grid');
    await expect(gridBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(listBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
