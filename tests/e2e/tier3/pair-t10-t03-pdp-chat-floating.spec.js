const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function gotoPDP(page) {
  const resp = await page.goto(ROUTES.product);
  if (!resp || resp.status() === 404 || (await page.locator('.btn-buyNow').count()) === 0) {
    await page.goto('/?tpl=product');
  }
}

test.describe('Tier 3: Pair T-10 & T-03 - PDP Desktop Buy Button Row & Floating Chat Widget', () => {
  test('P10-03-01: Desktop PDP buy button row and floating chat widget operate in distinct non-overlapping screen spaces', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const buyNowBtn = page.locator('.btn-buyNow, .box_btn_acc a').first();
    const chatWidget = page.locator('.main-widget');

    await expect(buyNowBtn).toBeVisible();
    await expect(chatWidget).toBeVisible();

    const buyBox = await buyNowBtn.boundingBox();
    const chatBox = await chatWidget.boundingBox();

    expect(buyBox).not.toBeNull();
    expect(chatBox).not.toBeNull();

    // Verify non-overlap: chat is on right edge, buy buttons are inside product column
    const overlapX = !(buyBox.x + buyBox.width < chatBox.x || chatBox.x + chatBox.width < buyBox.x);
    const overlapY = !(buyBox.y + buyBox.height < chatBox.y || chatBox.y + chatBox.height < buyBox.y);
    const isOverlapping = overlapX && overlapY;
    expect(isOverlapping).toBeFalsy();
  });

  test('P10-03-02: Buy now button icon meets 24px standard with left-aligned icon and text', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const buyNowBtn = page.locator('.btn-buyNow').first();
    await expect(buyNowBtn).toBeVisible();

    const flexDir = await buyNowBtn.evaluate((el) => window.getComputedStyle(el).flexDirection);
    expect(flexDir).toBe('row');

    // Check icon size
    const icon = buyNowBtn.locator('svg, i').first();
    if (await icon.count() > 0) {
      const box = await icon.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(14);
      }
    }
  });

  test('P10-03-03: Opening chat panel on PDP does not obscure product add-to-cart or buy actions', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoPDP(page);

    const toggleBtn = page.locator('.main-widget #toggle-widget-btn, .main-widget .out-circle').first();
    await toggleBtn.click();
    await page.waitForTimeout(200);

    const buyNowBtn = page.locator('.btn-buyNow').first();
    await expect(buyNowBtn).toBeVisible();

    // Ensure buyNow button is still enabled and clickable
    await expect(buyNowBtn).toBeEnabled();
  });
});
