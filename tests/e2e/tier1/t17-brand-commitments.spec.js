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
    brand: '/thuong-hieu',
  };
}

test.describe('T-17: Brand Commitments & Responsive Banner (Tier 1)', () => {
  test('T-17-01: Brand page loads successfully and displays page heading', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    const headingText = await heading.textContent();
    expect(headingText).toMatch(/thương hiệu|brands/i);
  });

  test('T-17-02: Desktop (1440px) displays brand banner and partner commitments section', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const partnerSection = page.locator('section[aria-label="Danh sách thương hiệu đối tác"], section:has-text("THƯƠNG HIỆU ĐỐI TÁC")').first();
    await expect(partnerSection).toBeVisible();

    const partnerHeading = partnerSection.locator('h2, h3').first();
    await expect(partnerHeading).toBeVisible();
  });

  test('T-17-03: Mobile viewport (390px) suppresses or hides desktop promo banner', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.brand);

    const promoBanner = page.locator('.lg\\:col-span-4, [class*="max-lg:hidden"], [data-brand-promo-banner]');
    if (await promoBanner.count() > 0) {
      const banner = promoBanner.first();
      const isVisible = await banner.isVisible();
      const isDisplayNone = await banner.evaluate(el => window.getComputedStyle(el).display === 'none');
      expect(!isVisible || isDisplayNone).toBe(true);
    }
  });

  test('T-17-04: Authentic distributor guarantee and trust badges are rendered', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const trustBadges = page.locator('.pc-trust-badges, [class*="trust_badges"], section:has-text("chính hãng")');
    await expect(trustBadges.first()).toBeVisible();

    const textContent = await trustBadges.first().textContent();
    expect(textContent).toMatch(/chính hãng|cam kết|nhập khẩu/i);
  });

  test('T-17-05: Page does not expose artificial countdown timers or fake flash deal clocks', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const fakeTimers = page.locator('[data-fake-timer], .countdown-clock, #fake-countdown');
    expect(await fakeTimers.count()).toBe(0);
  });

  test('T-17-06: Brand page total counter displays authentic brand count from data', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const brandTotal = page.locator('[data-brand-total], span:has-text("thương hiệu")');
    await expect(brandTotal.first()).toBeVisible();

    const text = await brandTotal.first().textContent();
    expect(/\d+/.test(text)).toBeTruthy();
  });
});
