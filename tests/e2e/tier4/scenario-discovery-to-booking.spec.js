const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function gotoServices(page) {
  const resp = await page.goto('/collections/dieu-tri-chuyen-nghiep');
  if (!resp || resp.status() === 404 || (await page.locator('.lt-pgrid').count()) === 0) {
    await page.goto(ROUTES.services || '/collections/dieu-tri-chuyen-nghiep');
  }
}

test.describe('Tier 4: Scenario 1 - Patient Discovery to Clinical Booking Flow', () => {
  test('SC01-01: End-to-end desktop journey: Homepage static spa cards -> Service collection -> #3CB371 booking CTA', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // Step 1: Patient starts on homepage
    await page.goto(ROUTES.home);
    const spaSection = page.locator('#section_spa, section[aria-labelledby="spa-section-title"]').first();
    await expect(spaSection).toBeVisible();

    // Step 2: Validate 4 step cards are informative static cards
    const stepCards = spaSection.locator('ol li');
    if (await stepCards.count() > 0) {
      const firstStep = stepCards.first();
      // Ensure no <a> wrapper
      expect(await firstStep.locator('xpath=ancestor-or-self::a').count()).toBe(0);
      const cursor = await firstStep.evaluate((el) => window.getComputedStyle(el).cursor);
      expect(cursor).not.toBe('pointer');
    }

    // Step 3: Left column appointment CTA is active and prominent
    const leftCta = spaSection.locator('a[href*="dat-lich"], a:has-text("Đặt lịch")').first();
    await expect(leftCta).toBeVisible();
    const ctaHref = await leftCta.getAttribute('href');
    expect(ctaHref).not.toBeNull();

    // Step 4: Navigate to service page
    await gotoServices(page);

    // Step 5: Verify compact service page spacing (T-01)
    const introSection = page.locator('.lt-intro--collection');
    await expect(introSection).toBeVisible();
    const padTop = await introSection.evaluate((el) => parseFloat(window.getComputedStyle(el).paddingTop));
    expect(padTop).toBeLessThanOrEqual(32);

    // Step 6: Find service cards and inspect booking CTA
    const serviceCards = page.locator('.lt-pgrid .lt-card');
    const cardCount = await serviceCards.count();
    expect(cardCount).toBeGreaterThan(0);

    const firstCard = serviceCards.first();
    await expect(firstCard).toBeVisible();

    const bookBtn = firstCard.locator('.lt-btn--primary');
    await expect(bookBtn).toBeVisible();

    // Step 7: Verify #3CB371 brand button styling (T-02)
    const btnBg = await bookBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(btnBg).toBe('rgb(60, 179, 113)');

    const btnText = await bookBtn.evaluate((el) => window.getComputedStyle(el).color);
    expect(btnText).toBe('rgb(255, 255, 255)');

    // Step 8: Click booking CTA to initiate consultation
    const targetUrl = await bookBtn.getAttribute('href');
    expect(targetUrl).not.toBeNull();
    expect(targetUrl.length).toBeGreaterThan(0);
  });

  test('SC01-02: End-to-end mobile (390px) journey: Mobile discovery to consultation touchpoint', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    // Step 1: Mobile home discovery
    await page.goto(ROUTES.home);
    const spaSection = page.locator('#section_spa, section[aria-labelledby="spa-section-title"]').first();
    await expect(spaSection).toBeVisible();

    // Step 2: Navigate to service collection
    await gotoServices(page);

    // Step 3: Ensure mobile compact padding and touch targets
    const bookBtn = page.locator('.lt-pgrid .lt-btn--primary').first();
    await expect(bookBtn).toBeVisible();

    const box = await bookBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(40);
    expect(box.width).toBeGreaterThanOrEqual(70);

    // Step 4: Verify zero horizontal page scrolling
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(VIEWPORTS.mobile.width + 5);
  });
});
