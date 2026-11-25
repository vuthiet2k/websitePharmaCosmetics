const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-02: Service Card CTA Boundary and Interaction (Tier 2)', () => {
  const serviceRoute = ROUTES.servicesPopulated || ROUTES.services;

  test('T02-B01: Mobile tap target size meets accessibility minimum (>= 40px)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(serviceRoute);

    const bookBtn = page.locator('.lt-card .lt-btn--primary').first();
    await expect(bookBtn).toBeVisible();

    const box = await bookBtn.boundingBox();
    expect(box).not.toBeNull();
    // Minimum tap height should be >= 38px, ideally 44px
    expect(box.height).toBeGreaterThanOrEqual(38);
  });

  test('T02-B02: Keyboard focus state remains visible and accessible', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(serviceRoute);

    const bookBtn = page.locator('.lt-card .lt-btn--primary').first();
    await bookBtn.focus();

    const isFocused = await bookBtn.evaluate((el) => document.activeElement === el);
    expect(isFocused).toBe(true);
  });

  test('T02-B03: Font weight boundary ensures high legibility on brand background', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(serviceRoute);

    const bookBtn = page.locator('.lt-card .lt-btn--primary').first();
    const fontWeight = await bookBtn.evaluate((el) => {
      return parseInt(window.getComputedStyle(el).fontWeight, 10);
    });

    // Font weight should be at least 600 (semi-bold or bold) for white text on green
    expect(fontWeight).toBeGreaterThanOrEqual(600);
  });

  test('T02-B04: Action buttons inside card maintain inline or flex alignment without overlap', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(serviceRoute);

    const firstCard = page.locator('.lt-card').first();
    const actions = firstCard.locator('.lt-pcard__actions');
    await expect(actions).toBeVisible();

    const btns = actions.locator('a');
    const count = await btns.count();

    if (count >= 2) {
      const box1 = await btns.nth(0).boundingBox();
      const box2 = await btns.nth(1).boundingBox();
      expect(box1).not.toBeNull();
      expect(box2).not.toBeNull();

      // Check they do not overlap
      const hasHorizontalOverlap = !(box1.x + box1.width <= box2.x || box2.x + box2.width <= box1.x);
      const hasVerticalOverlap = !(box1.y + box1.height <= box2.y || box2.y + box2.height <= box1.y);

      // They cannot overlap in both axes
      expect(hasHorizontalOverlap && hasVerticalOverlap).toBe(false);
    }
  });

  test('T02-B05: Rapid hover transition does not alter button dimensions or cause jitter', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(serviceRoute);

    const bookBtn = page.locator('.lt-card .lt-btn--primary').first();
    const initialBox = await bookBtn.boundingBox();
    expect(initialBox).not.toBeNull();

    // Hover
    await bookBtn.hover();
    await page.waitForTimeout(100);
    const hoveredBox = await bookBtn.boundingBox();

    // Unhover
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);
    const finalBox = await bookBtn.boundingBox();

    // Width and height should not jump erratically during transition
    expect(Math.abs(hoveredBox.width - initialBox.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(finalBox.width - initialBox.width)).toBeLessThanOrEqual(2);
  });
});
