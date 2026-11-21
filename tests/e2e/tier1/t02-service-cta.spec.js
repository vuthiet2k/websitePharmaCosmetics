const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-02: Service Card CTA Styling and Brand Color #3CB371 (Tier 1)', () => {
  const serviceRoute = ROUTES.servicesPopulated || ROUTES.services;

  test('T02-01: Book button on service cards has brand primary background color #3CB371', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(serviceRoute);

    const bookBtn = page.locator('.lt-card .lt-btn--primary').first();
    await expect(bookBtn).toBeVisible();

    const bgColor = await bookBtn.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // #3CB371 corresponds to rgb(60, 179, 113)
    expect(bgColor).toBe('rgb(60, 179, 113)');
  });

  test('T02-02: Book button text color is white', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(serviceRoute);

    const bookBtn = page.locator('.lt-card .lt-btn--primary').first();
    await expect(bookBtn).toBeVisible();
    await expect(bookBtn).toContainText('Đặt lịch');

    const textColor = await bookBtn.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // White text rgb(255, 255, 255)
    expect(textColor).toBe('rgb(255, 255, 255)');
  });

  test('T02-03: Secondary action button preserves light border and background', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(serviceRoute);

    const lightBtn = page.locator('.lt-card .lt-btn--light').first();
    await expect(lightBtn).toBeVisible();

    const bgColor = await lightBtn.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Secondary button must NOT have brand primary background #3CB371
    expect(bgColor).not.toBe('rgb(60, 179, 113)');

    const hasLightClass = await lightBtn.evaluate((el) => {
      return el.classList.contains('lt-btn--light');
    });
    expect(hasLightClass).toBe(true);
  });

  test('T02-04: Book button href links to valid appointment target', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(serviceRoute);

    const bookBtn = page.locator('.lt-card .lt-btn--primary').first();
    const href = await bookBtn.getAttribute('href');
    expect(href).not.toBeNull();
    expect(href.length).toBeGreaterThan(0);
  });

  test('T02-05: All service cards across mobile display primary booking CTA', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(serviceRoute);

    const bookButtons = page.locator('.lt-card .lt-btn--primary');
    const count = await bookButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = bookButtons.nth(i);
      await expect(btn).toBeVisible();
      const bg = await btn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(bg).toBe('rgb(60, 179, 113)');
    }
  });
});
