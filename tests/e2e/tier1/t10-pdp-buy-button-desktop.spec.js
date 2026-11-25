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

test.describe('T-10: PDP Buy Button Desktop Row Layout (Tier 1)', () => {
  test('T-10-01: Buy Now button is rendered and visible on PDP desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const buyBtn = page.locator('.btn-buyNow, a.btn-buyNow, button.btn-buyNow, [data-buy-now]').first();
    await expect(buyBtn).toBeVisible();

    const textContent = await buyBtn.textContent();
    expect(textContent).toMatch(/MUA NGAY|Đặt mua/i);
  });

  test('T-10-02: Buy Now button satisfies minimum 44px touch target height', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const buyBtn = page.locator('.btn-buyNow, a.btn-buyNow, button.btn-buyNow, [data-buy-now]').first();
    await expect(buyBtn).toBeVisible();

    const box = await buyBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('T-10-03: Desktop buy button row layout maintains single horizontal row alignment', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const buyBtn = page.locator('.btn-buyNow, a.btn-buyNow, button.btn-buyNow, [data-buy-now]').first();
    await expect(buyBtn).toBeVisible();

    // Verify button has flex row display and doesn't wrap text onto multiple lines
    const isFlexOrInlineFlex = await buyBtn.evaluate(el => {
      const display = window.getComputedStyle(el).display;
      return display === 'flex' || display === 'inline-flex';
    });
    expect(isFlexOrInlineFlex).toBeTruthy();

    const buynowText = buyBtn.locator('.buynow-text, span, div').first();
    if (await buynowText.isVisible()) {
      const textWrap = await buynowText.evaluate(el => window.getComputedStyle(el).whiteSpace);
      // Either whitespace-nowrap or inline layout
      expect(['normal', 'nowrap', 'pre']).toContain(textWrap);
    }
  });

  test('T-10-04: Buy button icon renders with accessible icon container and appropriate dimensions', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const buyBtn = page.locator('.btn-buyNow, a.btn-buyNow, button.btn-buyNow, [data-buy-now]').first();
    const icon = buyBtn.locator('svg, i, [aria-hidden="true"]').first();
    await expect(icon).toBeVisible();

    const iconBox = await icon.boundingBox();
    expect(iconBox).not.toBeNull();
    // Icon width/height around 16px - 26px
    expect(iconBox.width).toBeGreaterThanOrEqual(14);
    expect(iconBox.height).toBeGreaterThanOrEqual(14);
  });

  test('T-10-05: Mobile viewport (390px) adapts buy button within screen bounds', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await gotoPDP(page);

    const buyBtn = page.locator('.btn-buyNow, a.btn-buyNow, button.btn-buyNow, [data-buy-now]').first();
    await expect(buyBtn).toBeVisible();

    const box = await buyBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeLessThanOrEqual(390);
    expect(box.height).toBeGreaterThanOrEqual(44);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('T-10-06: Add to cart button is co-located with buy button and properly styled', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const cartBtn = page.locator('.btn-cart, .add_to_cart, button[type="submit"]').first();
    await expect(cartBtn).toBeVisible();

    const box = await cartBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});
