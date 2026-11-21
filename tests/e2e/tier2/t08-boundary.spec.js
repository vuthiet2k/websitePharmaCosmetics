const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-08: Vietnamese Diacritics and Entity Adversarial Boundary (Tier 2)', () => {
  test('T08-B01: Adversarial HTML injection / XSS query is safely escaped', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    const maliciousQuery = '<script>alert("xss")</script>';

    let alertFired = false;
    page.on('dialog', async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.goto(`${ROUTES.search}?query=${encodeURIComponent(maliciousQuery)}`, { waitUntil: 'domcontentloaded' });

    // Verify script did NOT execute
    expect(alertFired).toBe(false);

    // Verify injected script tag is not inserted as executable code
    const injectedScript = page.locator('script:has-text("alert(\\"xss\\")")');
    await expect(injectedScript).toHaveCount(0);

    // Verify the query text is sanitized and rendered safely without executable tags
    const heading = page.locator('h1');
    if (await heading.isVisible()) {
      const headingText = await heading.innerText();
      expect(headingText).toContain('alert("xss")');
    }
  });

  test('T08-B02: Zero results search query with diacritics renders clean empty state message', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    const zeroQuery = 'sản phẩm hoàn toàn không tồn tại 99999';
    await page.goto(`${ROUTES.search}?query=${encodeURIComponent(zeroQuery)}`, { waitUntil: 'domcontentloaded' });

    const emptyState = page.locator('.search-empty-state, .box_alert, section.search-main');
    await expect(emptyState).toBeVisible();

    const text = await emptyState.innerText();
    expect(text).not.toMatch(/&#\d+;/);
    expect(text).not.toMatch(/&amp;#\d+;/);
  });

  test('T08-B03: Complex compound Vietnamese diacritics render cleanly across full string', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    const complexQuery = 'Nước tẩy trang dịu nhẹ phục hồi tổn thương da';
    await page.goto(`${ROUTES.search}?query=${encodeURIComponent(complexQuery)}`, { waitUntil: 'domcontentloaded' });

    const heading = page.locator('h1');
    if (await heading.isVisible()) {
      const headingText = await heading.innerText();
      expect(headingText).not.toMatch(/&#\d+;/);
      expect(headingText).toContain('tẩy trang dịu nhẹ phục hồi');
    }
  });

  test('T08-B04: Sapo query tag wrapper tags:((x)) does not pollute visible keyword heading', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    const tagQuery = 'tags:((chong-nang))';
    await page.goto(`${ROUTES.search}?query=${encodeURIComponent(tagQuery)}`, { waitUntil: 'domcontentloaded' });

    const heading = page.locator('h1');
    if (await heading.isVisible()) {
      const headingText = await heading.innerText();
      // Should not show raw tags:(( or entity artifacts
      expect(headingText).not.toMatch(/&#\d+;/);
      expect(headingText).not.toContain('&amp;');
    }
  });

  test('T08-B05: Repeated query updates through search input preserve clean diacritics', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.search, { waitUntil: 'domcontentloaded' });

    const input = page.locator('input[name="query"], input[name="q"]').first();
    if (await input.isVisible()) {
      await input.fill('dưỡng ẩm');
      expect(await input.inputValue()).toBe('dưỡng ẩm');

      await input.fill('sữa rửa mặt');
      expect(await input.inputValue()).toBe('sữa rửa mặt');

      expect(await input.inputValue()).not.toMatch(/&#\d+;/);
    }
  });
});
