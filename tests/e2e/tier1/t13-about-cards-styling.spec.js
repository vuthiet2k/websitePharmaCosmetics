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
    about: '/about-us',
  };
}

test.describe('T-13: About Us Cards Styling (Tier 1)', () => {
  test('T-13-01: Mission and Workflow cards exist on About Us page', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const missionSection = page.locator('#about-mission, section:has-text("Sứ mệnh")').first();
    const methodSection = page.locator('#about-method, section:has-text("Quy trình")').first();

    await expect(missionSection).toBeVisible();
    await expect(methodSection).toBeVisible();
  });

  test('T-13-02: Workflow step cards have circular green numbered badges', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const methodSection = page.locator('#about-method, section:has-text("Quy trình")').first();
    await expect(methodSection).toBeVisible();

    const badges = methodSection.locator('span.rounded-full, .w-9.h-9, [class*="step-badge"]');
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const firstBadge = badges.first();
    await expect(firstBadge).toBeVisible();

    // Verify circular shape (rounded-full)
    const borderRadius = await firstBadge.evaluate(el => window.getComputedStyle(el).borderRadius);
    expect(borderRadius).toMatch(/50%|9999px|18px|20px/);
  });

  test('T-13-03: Cards display subtle brand-tinted background styling', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const methodCards = page.locator('#about-method .grid > div, [class*="about-card"]');
    const count = await methodCards.count();
    expect(count).toBeGreaterThan(0);

    const card = methodCards.first();
    const bgColor = await card.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('T-13-04: Card borders use subtle brand border styling', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const methodCards = page.locator('#about-method .grid > div, [class*="about-card"]');
    const card = methodCards.first();

    const borderStyle = await card.evaluate(el => {
      const comp = window.getComputedStyle(el);
      return {
        width: comp.borderWidth,
        style: comp.borderStyle,
        color: comp.borderColor,
      };
    });

    expect(borderStyle.style).toBe('solid');
    expect(parseFloat(borderStyle.width)).toBeGreaterThan(0);
  });

  test('T-13-05: Legal compliance and clinical laboratory block is present and structured', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const labSection = page.locator('#about-lab, section:has-text("Cơ sở vật chất"), section:has-text("Phòng trị liệu")').first();
    await expect(labSection).toBeVisible();

    // Check presence of trust badges inside lab section
    const badges = labSection.locator('span, [class*="badge"]');
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('T-13-06: Mobile viewport (390px) stacks cards vertically with appropriate padding', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.about);

    const methodSection = page.locator('#about-method, section:has-text("Quy trình")').first();
    await expect(methodSection).toBeVisible();

    const cards = methodSection.locator('.grid > div');
    const count = await cards.count();
    expect(count).toBeGreaterThan(1);

    const box1 = await cards.nth(0).boundingBox();
    const box2 = await cards.nth(1).boundingBox();
    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();

    // Vertical stacking on mobile: box2.y should be below box1.y
    expect(box2.y).toBeGreaterThanOrEqual(box1.y + box1.height - 10);
  });
});
