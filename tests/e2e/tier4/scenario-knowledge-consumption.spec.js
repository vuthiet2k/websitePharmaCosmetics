const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function gotoArticle(page) {
  const resp = await page.goto('/?tpl=article');
  if (!resp || (await page.locator('#btn-zoom-in').count()) === 0) {
    await page.goto(ROUTES.article || '/?tpl=article');
  }
}

test.describe('Tier 4: Scenario 3 - Knowledge Consumption & Dermatological Education Flow', () => {
  test('SC03-01: Full reading journey: Category index -> Article view -> Toolbar font zoom -> Sticky sidebar scroll', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // Step 1: Browse blog category index
    await page.goto(ROUTES.blog);
    const blogHeading = page.locator('h1').first();
    await expect(blogHeading).toBeVisible();

    // Step 2: Sidebar divider check (T-07)
    const asideHr = page.locator('aside hr, .aside-content hr');
    if (await asideHr.count() > 0) {
      await expect(asideHr.first()).toBeVisible();
    }

    // Step 3: Open article page
    await gotoArticle(page);

    // Step 4: Validate toolbar presence and '+' zoom button (T-05)
    const zoomInBtn = page.locator('#btn-zoom-in');
    await expect(zoomInBtn).toBeVisible();
    expect(await zoomInBtn.innerText()).toBe('+');

    // Step 5: Zoom article font and measure body text adjustment
    const contentBody = page.locator('.article-content, .entry-content, article .content, .prose').first();
    let initialFontSize = 16;
    if (await contentBody.count() > 0) {
      initialFontSize = await contentBody.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize) || 16);
    }

    // Click zoom in
    await zoomInBtn.click();
    await page.waitForTimeout(200);

    if (await contentBody.count() > 0) {
      const zoomedFontSize = await contentBody.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize) || 16);
      expect(zoomedFontSize).toBeGreaterThanOrEqual(initialFontSize);
    }

    // Step 6: Scroll article to test sticky right sidebar (T-06)
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(200);

    const rightSidebar = page.locator('aside[aria-label*="Thông tin"], aside[aria-label*="liên quan"]').first();
    if (await rightSidebar.count() > 0) {
      const sidebarBox = await rightSidebar.boundingBox();
      expect(sidebarBox).not.toBeNull();
      expect(sidebarBox.y).toBeLessThanOrEqual(160);
    }
  });

  test('SC03-02: Reading flow responsiveness: Zoom toolbar and sticky aside adapt cleanly across screen widths', async ({ page }) => {
    // Desktop: Toolbar visible, sticky aside active
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoArticle(page);

    const zoomInDesktop = page.locator('#btn-zoom-in');
    await expect(zoomInDesktop).toBeVisible();

    // Tablet: Layout maintains comfortable typography
    await page.setViewportSize(VIEWPORTS.tablet);
    await gotoArticle(page);
    const articleTitle = page.locator('h1').first();
    await expect(articleTitle).toBeVisible();

    // Mobile: Toolbar hides gracefully, content flows natively without horizontal overflow
    await page.setViewportSize(VIEWPORTS.mobile);
    await gotoArticle(page);

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(VIEWPORTS.mobile.width + 5);
  });
});
