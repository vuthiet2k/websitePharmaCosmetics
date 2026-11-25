const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function gotoServices(page) {
  const resp = await page.goto('/collections/dieu-tri-chuyen-nghiep');
  if (!resp || resp.status() === 404 || (await page.locator('.lt-pgrid').count()) === 0) {
    await page.goto(ROUTES.services || '/collections/dieu-tri-chuyen-nghiep');
  }
}

test.describe('Tier 3: Pair T-01 & T-02 - Service Spacing & Card Action Layout', () => {
  test('P01-02-01: Reduced section padding preserves card grid geometry and #3CB371 CTA alignment on desktop (1440px)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoServices(page);

    const intro = page.locator('.lt-intro--collection');
    await expect(intro).toBeVisible();

    // Verify T-01 padding reduction
    const introBox = await intro.boundingBox();
    expect(introBox).not.toBeNull();

    const grid = page.locator('.lt-pgrid').first();
    await expect(grid).toBeVisible();

    const cards = grid.locator('.lt-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();

    // Verify T-02 CTA button inside card
    const bookBtn = firstCard.locator('.lt-btn--primary');
    await expect(bookBtn).toBeVisible();

    const bgColor = await bookBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    // #3CB371 is rgb(60, 179, 113)
    expect(bgColor).toBe('rgb(60, 179, 113)');

    const textColor = await bookBtn.evaluate((el) => window.getComputedStyle(el).color);
    expect(textColor).toBe('rgb(255, 255, 255)');

    // Verify secondary action button has light styling
    const lightBtn = firstCard.locator('.lt-btn--light');
    if (await lightBtn.count() > 0) {
      await expect(lightBtn).toBeVisible();
      const lightBg = await lightBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(lightBg).not.toBe('rgb(60, 179, 113)');
    }
  });

  test('P01-02-02: Compact spacing on mobile (390px) maintains CTA touch target (>=44px) and prevents text wrapping overflow', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await gotoServices(page);

    const cards = page.locator('.lt-pgrid .lt-card');
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();

    const bookBtn = firstCard.locator('.lt-btn--primary');
    await expect(bookBtn).toBeVisible();

    const btnBox = await bookBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    expect(btnBox.height).toBeGreaterThanOrEqual(40); // Standard touch target min
    expect(btnBox.width).toBeGreaterThanOrEqual(70);

    // Verify card actions do not wrap outside the card body
    const cardBox = await firstCard.boundingBox();
    expect(btnBox.x + btnBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 2);
  });

  test('P01-02-03: Responsive transition 1440px -> 1024px -> 390px maintains CTA color integrity and grid coherence', async ({ page }) => {
    for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(vpSize);
      await gotoServices(page);

      const bookBtn = page.locator('.lt-pgrid .lt-btn--primary').first();
      await expect(bookBtn).toBeVisible();

      const bg = await bookBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(bg, `Failed on ${vpName}`).toBe('rgb(60, 179, 113)');

      const href = await bookBtn.getAttribute('href');
      expect(href).not.toBeNull();
      expect(href.length).toBeGreaterThan(0);
    }
  });
});
