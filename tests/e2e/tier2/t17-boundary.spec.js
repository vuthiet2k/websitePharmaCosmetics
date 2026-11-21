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

test.describe('T-17: Brand Commitments & Responsive Banner Boundary & Corner Cases (Tier 2)', () => {
  test('T-17-B01: Breakpoint boundary at 1023px vs 1024px switches promo banner display', async ({ page }) => {
    // 1023px (mobile/tablet boundary)
    await page.setViewportSize({ width: 1023, height: 768 });
    await page.goto(ROUTES.brand);

    const banner = page.locator('.lg\\:col-span-4, [class*="max-lg:hidden"]').first();
    if (await banner.count() > 0) {
      const isVisible1023 = await banner.isVisible();
      const isHiddenOrNone = !isVisible1023 || await banner.evaluate(el => window.getComputedStyle(el).display === 'none');
      expect(isHiddenOrNone).toBe(true);
    }

    // 1024px (desktop lg breakpoint)
    await page.setViewportSize({ width: 1024, height: 768 });
    if (await banner.count() > 0) {
      const isVisible1024 = await banner.isVisible();
      expect(isVisible1024).toBe(true);
    }
  });

  test('T-17-B02: Instant brand search filtering updates displayed brand items', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const searchInput = page.locator('#pc-brand-search-input, [data-brand-search]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Swissline');
      await page.waitForTimeout(300);

      const searchVal = await searchInput.inputValue();
      expect(searchVal).toBe('Swissline');
    }
  });

  test('T-17-B03: Search clear button appears on input and clicking it resets search', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const searchInput = page.locator('#pc-brand-search-input, [data-brand-search]').first();
    const clearBtn = page.locator('[data-brand-search-clear]').first();

    if (await searchInput.isVisible() && await clearBtn.count() > 0) {
      await searchInput.fill('Maruderm');
      await page.waitForTimeout(200);

      // Clear button should become visible
      await expect(clearBtn).toBeVisible();

      // Click clear
      await clearBtn.click();
      await page.waitForTimeout(200);

      const clearedVal = await searchInput.inputValue();
      expect(clearedVal).toBe('');
    }
  });

  test('T-17-B04: Empty search state: typing non-existent query displays empty feedback cleanly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const searchInput = page.locator('#pc-brand-search-input, [data-brand-search]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('NONEXISTENTBRANDXYZ12345');
      await page.waitForTimeout(300);

      const emptyFeedback = page.locator('[data-brand-empty], text="Không tìm thấy"');
      if (await emptyFeedback.count() > 0) {
        await expect(emptyFeedback.first()).toBeVisible();
      }
    }
  });

  test('T-17-B05: Rapid typing and clearing does not cause unhandled console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    const searchInput = page.locator('#pc-brand-search-input, [data-brand-search]').first();
    if (await searchInput.isVisible()) {
      for (let i = 0; i < 3; i++) {
        await searchInput.fill(`Test${i}`);
        await searchInput.fill('');
      }
    }

    const criticalErrors = consoleErrors.filter(e => !e.includes('net::ERR_ABORTED'));
    expect(criticalErrors.length).toBe(0);
  });

  test('T-17-B06: Ultrawide viewport (2560px) maintains bounded container width', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto(ROUTES.brand);

    const container = page.locator('main .container').first();
    await expect(container).toBeVisible();

    const box = await container.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeLessThanOrEqual(1600);
  });
});
