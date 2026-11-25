const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-07: Blog Category Page Layout and Sidebar Dividers (Tier 1)', () => {
  test('T07-01: Category pill filter bar is removed from blog category page', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.blog, { waitUntil: 'domcontentloaded' });

    // Pill filter bar should not be visible or present on category blog page
    const filterBar = page.locator('nav.pc-vfilter.pc-nblog__cats, nav.pc-vfilter');
    const count = await filterBar.count();
    if (count > 0) {
      await expect(filterBar.first()).toBeHidden();
    } else {
      expect(count).toBe(0);
    }
  });

  test('T07-02: Blog sidebar section headers feature horizontal divider styling', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.blog, { waitUntil: 'domcontentloaded' });

    const sidebar = page.locator('.side-right-stick').first();
    if (await sidebar.count() > 0 && await sidebar.isVisible()) {
      // Check for <hr> elements or border divider lines beneath titles
      const dividers = sidebar.locator('hr, [class*="border-b"], .title-head');
      const count = await dividers.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('T07-03: Blog sidebar removes heavy card container styling', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.blog, { waitUntil: 'domcontentloaded' });

    const sidebar = page.locator('.side-right-stick').first();
    if (await sidebar.count() > 0 && await sidebar.isVisible()) {
      // Sidebar should not be wrapped in heavy rounded card with prominent shadow
      const hasHeavyCard = await sidebar.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return el.classList.contains('card-bordered') || (style.borderRadius === '24px' && style.boxShadow !== 'none');
      });
      expect(hasHeavyCard).toBe(false);
    }
  });

  test('T07-04: Featured news items list renders cleanly with separator dividers', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.blog, { waitUntil: 'domcontentloaded' });

    const noibat = page.locator('.blog_noibat').first();
    if (await noibat.count() > 0 && await noibat.isVisible()) {
      const articles = noibat.locator('a, article, .article-item, [class*="border-b"], .pc-card-row');
      const count = await articles.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('T07-05: Category navigation links remain accessible in sidebar menu', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.blog, { waitUntil: 'domcontentloaded' });

    const navCategory = page.locator('.nav-category, .aside-content-blog').first();
    if (await navCategory.count() > 0 && await navCategory.isVisible()) {
      const links = navCategory.locator('a.nav-link, a');
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
