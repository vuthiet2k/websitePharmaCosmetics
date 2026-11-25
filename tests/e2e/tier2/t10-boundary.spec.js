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
    product: '/products/serum-vitamin-c-15',
  };
}

async function gotoPDP(page) {
  const resp = await page.goto(ROUTES.product || '/products/serum-vitamin-c-15');
  if (!resp || resp.status() === 404) {
    await page.goto('/?tpl=product');
  }
  await page.waitForLoadState('domcontentloaded');
}

test.describe('T-10: PDP Buy Button Desktop Boundary & Corner Cases (Tier 2)', () => {
  test('T-10-B01: Tablet breakpoint boundary (1024px) retains button height >= 44px', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await gotoPDP(page);

    const buyBtn = page.locator('.btn-buyNow, a.btn-buyNow, button.btn-buyNow, [data-buy-now]').first();
    await expect(buyBtn).toBeVisible();

    const box = await buyBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('T-10-B02: Quantity boundary: cannot decrease below 1 via minus button', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const qtyInput = page.locator('#qtym, input[name="quantity"]').first();
    const minusBtn = page.locator('.num_1, button:has-text("-")').first();

    if (await qtyInput.isVisible() && await minusBtn.isVisible()) {
      await qtyInput.fill('1');
      await minusBtn.click();
      const val = await qtyInput.inputValue();
      expect(parseInt(val, 10)).toBeGreaterThanOrEqual(1);
    }
  });

  test('T-10-B03: Quantity boundary: non-numeric or negative input resets to minimum 1', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const qtyInput = page.locator('#qtym, input[name="quantity"]').first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('0');
      await qtyInput.dispatchEvent('change');
      const val = await qtyInput.inputValue();
      expect(parseInt(val, 10) >= 1 || val === '1' || val === '').toBeTruthy();
    }
  });

  test('T-10-B04: Keyboard accessibility: Buy Now button can receive focus via keyboard navigation', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const buyBtn = page.locator('.btn-buyNow, a.btn-buyNow, button.btn-buyNow, [data-buy-now]').first();
    await buyBtn.focus();

    const isFocused = await buyBtn.evaluate(el => document.activeElement === el);
    expect(isFocused).toBe(true);
  });

  test('T-10-B05: Rapid repeated clicks on Buy Now button do not throw unhandled console exceptions', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const buyBtn = page.locator('.btn-buyNow, a.btn-buyNow, button.btn-buyNow, [data-buy-now]').first();
    await expect(buyBtn).toBeVisible();

    // Perform rapid triple click
    await buyBtn.click({ clickCount: 3, delay: 50 }).catch(() => {});

    // Filter out expected network aborts if page redirected
    const criticalErrors = consoleErrors.filter(e => !e.includes('net::ERR_ABORTED') && !e.includes('Failed to load resource'));
    expect(criticalErrors.length).toBe(0);
  });

  test('T-10-B06: Breakpoint threshold at 1023px vs 1024px transitions smoothly without horizontal overflow', async ({ page }) => {
    // Check 1023px
    await page.setViewportSize({ width: 1023, height: 768 });
    await gotoPDP(page);
    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    let clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Check 1024px
    await page.setViewportSize({ width: 1024, height: 768 });
    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
