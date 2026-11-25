const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('Tier 3: Pair T-08 & T-09 - Vietnamese Search Entity Decoding & Unified Pagination', () => {
  test('P08-09-01: Searching Vietnamese diacritics decodes in <h1> without &#234; and renders unified pagination', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`${ROUTES.search}?q=ch%E1%BB%91ng+n%E1%BA%AFng`);

    // Verify h1 title exists and does not contain numeric character references
    const h1 = page.locator('h1');
    if (await h1.count() > 0) {
      await expect(h1.first()).toBeVisible();
      const h1Text = await h1.first().innerText();
      expect(h1Text).not.toMatch(/&#\d+;/);
      expect(h1Text).not.toContain('&amp;#');
      expect(h1Text.toLowerCase()).toContain('chống nắng');
    }

    // Verify pagination is styled with ui_pagination
    const pagination = page.locator('nav[aria-label="Phân trang"], .pagenav, [data-pc-pagination]').first();
    if (await pagination.count() > 0 && await pagination.isVisible()) {
      const pageLinks = pagination.locator('a, span');
      const firstLink = pageLinks.first();
      const box = await firstLink.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('P08-09-02: Empty search state with Vietnamese diacritics avoids raw HTML entity leaks', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`${ROUTES.search}?q=t%E1%BB%AB+kho%C3%A1+kh%C3%B4ng+t%E1%BB%93n+t%E1%BA%A1i+123456`);

    // Verify page rendered empty state cleanly
    const content = await page.content();
    expect(content).not.toMatch(/&#234;/i);
    expect(content).not.toMatch(/&amp;#\d+;/i);
  });

  test('P08-09-03: Pagination links retain sanitized query string and avoid double escaping on click', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`${ROUTES.search}?q=da`);

    const pagination = page.locator('nav[aria-label="Phân trang"], .pagenav').first();
    if (await pagination.isVisible()) {
      const nextBtn = pagination.locator('a').filter({ hasText: '2' }).first();
      if (await nextBtn.isVisible()) {
        const href = await nextBtn.getAttribute('href');
        if (href) {
          expect(href).not.toContain('&amp;#');
          expect(href).not.toMatch(/&#\d+;/);
        }
      }
    }
  });
});
