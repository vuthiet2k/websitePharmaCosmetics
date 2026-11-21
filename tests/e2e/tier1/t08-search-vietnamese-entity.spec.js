const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-08: Vietnamese Diacritics and Entity Decoding in Search (Tier 1)', () => {
  test('T08-01: Vietnamese query "lên" renders correctly in search heading without &#234;', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`${ROUTES.search}?query=${encodeURIComponent('lên')}`);

    const heading = page.locator('h1');
    if (await heading.isVisible()) {
      const headingText = await heading.innerText();
      // Must NOT contain raw entity syntax like &#234; or &amp;#234;
      expect(headingText).not.toMatch(/&#\d+;/);
      expect(headingText).not.toMatch(/&amp;#\d+;/);
      expect(headingText).toContain('lên');
    }
  });

  test('T08-02: Vietnamese query "Chống nắng lên tone" renders clean diacritics in heading', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    const query = 'Chống nắng lên tone';
    await page.goto(`${ROUTES.search}?query=${encodeURIComponent(query)}`);

    const heading = page.locator('h1');
    if (await heading.isVisible()) {
      const text = await heading.innerText();
      expect(text).not.toContain('&#234;');
      expect(text).not.toContain('&amp;');
      expect(text).toContain('Chống nắng lên tone');
    }
  });

  test('T08-03: Search input field displays decoded Vietnamese query value', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    const query = 'kem dưỡng';
    await page.goto(`${ROUTES.search}?query=${encodeURIComponent(query)}`);

    const searchInput = page.locator('input[name="query"], input[name="q"]').first();
    if (await searchInput.isVisible()) {
      const val = await searchInput.inputValue();
      expect(val).not.toMatch(/&#\d+;/);
      expect(val).toContain('kem dưỡng');
    }
  });

  test('T08-04: Breadcrumb displays clean decoded Vietnamese search query', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    const query = 'làn da';
    await page.goto(`${ROUTES.search}?query=${encodeURIComponent(query)}`);

    const breadcrumb = page.locator('.breadcrumb, nav[aria-label="breadcrumbs"]');
    if (await breadcrumb.isVisible()) {
      const bcText = await breadcrumb.innerText();
      expect(bcText).not.toMatch(/&#\d+;/);
      expect(bcText).not.toMatch(/&amp;#\d+;/);
    }
  });

  test('T08-05: Page <title> does not expose numeric entity codes', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    const query = 'tẩy tế bào chết';
    await page.goto(`${ROUTES.search}?query=${encodeURIComponent(query)}`);

    const pageTitle = await page.title();
    expect(pageTitle).not.toMatch(/&#\d+;/);
    expect(pageTitle).not.toMatch(/&amp;#\d+;/);
  });
});
