const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function navigateToArticle(page) {
  const resp = await page.goto(ROUTES.article, { waitUntil: 'domcontentloaded' });
  if (!resp || resp.status() === 404) {
    await page.goto(ROUTES.articleTpl || '/?tpl=article', { waitUntil: 'domcontentloaded' });
  }
}

test.describe('T-06: Article Right Sidebar Sticky and Scroll (Tier 1)', () => {
  test('T06-01: Right sidebar has sticky top positioning on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const sidebar = page.locator('aside[aria-label="Thông tin liên quan và chủ đề"]');
    await expect(sidebar).toBeVisible();

    const isSticky = await sidebar.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.position === 'sticky' || el.classList.contains('sticky') || el.classList.contains('lg:sticky');
    });

    expect(isSticky).toBe(true);
  });

  test('T06-02: Right sidebar contains related articles block (Tin liên quan)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const relatedNews = page.locator('aside:has-text("TIN LIÊN QUAN")');
    await expect(relatedNews).toBeVisible();

    const articles = page.locator('aside article');
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('T06-03: Right sidebar contains related products block (SẢN PHẨM LIÊN QUAN)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const relatedProducts = page.locator('aside:has-text("SẢN PHẨM LIÊN QUAN")');
    await expect(relatedProducts).toBeVisible();
  });

  test('T06-04: Parent container uses items-start layout alignment', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const sidebar = page.locator('aside[aria-label="Thông tin liên quan và chủ đề"]');
    const parentAlign = await sidebar.evaluate((el) => {
      const parent = el.parentElement;
      return parent ? window.getComputedStyle(parent).alignItems : '';
    });

    // Parent must align items to start for sticky positioning to work properly
    expect(['flex-start', 'start']).toContain(parentAlign);
  });

  test('T06-05: Right sidebar maintains position relative to viewport when scrolling', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const sidebar = page.locator('aside[aria-label="Thông tin liên quan và chủ đề"]');
    await expect(sidebar).toBeVisible();

    // Scroll down 600px
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(300);

    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    // In sticky top-24, top offset should be around 96px (top-24 = 6rem = 96px)
    expect(box.y).toBeLessThanOrEqual(150);
    expect(box.y).toBeGreaterThanOrEqual(0);
  });
});
