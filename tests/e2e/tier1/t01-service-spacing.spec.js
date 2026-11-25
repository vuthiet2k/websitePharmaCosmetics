const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-01: Service Page Spacing and Padding (Tier 1)', () => {
  test('T01-01: Service page intro padding is compact on desktop (1440px)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.services);

    const introSection = page.locator('.lt-intro--collection');
    await expect(introSection).toBeVisible();

    const paddingTop = await introSection.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).paddingTop);
    });
    const paddingBottom = await introSection.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).paddingBottom);
    });

    // On desktop lg:!py-6 is 24px. Padding must be <= 32px, confirming reduced spacing.
    expect(paddingTop).toBeLessThanOrEqual(32);
    expect(paddingBottom).toBeLessThanOrEqual(32);
    expect(paddingTop).toBeGreaterThan(0);
  });

  test('T01-02: Service page section padding is compact on tablet (1024px)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(ROUTES.services);

    const mainSection = page.locator('.lt-section--white').first();
    await expect(mainSection).toBeVisible();

    const paddingTop = await mainSection.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).paddingTop);
    });
    const paddingBottom = await mainSection.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).paddingBottom);
    });

    // On tablet lg:!py-8 is 32px. Must be <= 40px, eliminating excess whitespace.
    expect(paddingTop).toBeLessThanOrEqual(40);
    expect(paddingBottom).toBeLessThanOrEqual(40);
  });

  test('T01-03: Service page padding is compact on mobile (390px)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.services);

    const introSection = page.locator('.lt-intro--collection');
    const mainSection = page.locator('.lt-section--white').first();
    await expect(introSection).toBeVisible();
    await expect(mainSection).toBeVisible();

    const introPadTop = await introSection.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).paddingTop);
    });
    const sectionPadTop = await mainSection.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).paddingTop);
    });

    // Mobile !py-4 is 16px, !py-5 is 20px. Must be <= 24px.
    expect(introPadTop).toBeLessThanOrEqual(24);
    expect(sectionPadTop).toBeLessThanOrEqual(24);
  });

  test('T01-04: Spacing between title/header and cards grid is narrow on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.servicesPopulated || ROUTES.services);

    const intro = page.locator('.lt-intro--collection');
    const grid = page.locator('.lt-pgrid').first();

    await expect(intro).toBeVisible();
    await expect(grid).toBeVisible();

    const introBox = await intro.boundingBox();
    const gridBox = await grid.boundingBox();
    expect(introBox).not.toBeNull();
    expect(gridBox).not.toBeNull();

    // Distance from bottom of intro section to top of grid
    // Section padding is !py-5 lg:!py-8 (32px). The gap must be <= 48px.
    const gap = gridBox.y - (introBox.y + introBox.height);
    expect(gap).toBeLessThanOrEqual(48);
    expect(gap).toBeGreaterThanOrEqual(0);
  });

  test('T01-05: Service grid cards layout renders without vertical gaps overflow', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.servicesPopulated || ROUTES.services);

    const cards = page.locator('.lt-pgrid .lt-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();

    const cardBox = await firstCard.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox.height).toBeGreaterThan(100);
    expect(cardBox.width).toBeGreaterThan(150);
  });
});
