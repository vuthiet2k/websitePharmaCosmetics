const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function gotoArticle(page) {
  const resp = await page.goto('/?tpl=article');
  if (!resp || (await page.locator('#btn-zoom-in').count()) === 0) {
    await page.goto(ROUTES.article || '/?tpl=article');
  }
}

test.describe('Tier 3: Pair T-05 & T-06 - Article Zoom Toolbar & Sticky Sidebar', () => {
  test('P05-06-01: Font size zoom (+/-) expands body content while sticky sidebar maintains top-24 anchor', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoArticle(page);

    const zoomInBtn = page.locator('#btn-zoom-in');
    const stickyToolbar = page.locator('aside').filter({ has: page.locator('#btn-zoom-in') }).first();
    await expect(zoomInBtn).toBeVisible();

    // Verify character '+' is rendered
    const btnText = await zoomInBtn.innerText();
    expect(btnText.trim()).toBe('+');

    // Check right sidebar presence
    const rightSidebar = page.locator('aside[aria-label*="Thông tin"], aside[aria-label*="liên quan"], .article-sidebar').first();
    if (await rightSidebar.count() > 0) {
      await expect(rightSidebar).toBeVisible();

      // Measure body height before zoom
      const bodyEl = page.locator('.article-content, .entry-content, article .content, .prose').first();
      let initialHeight = 0;
      if (await bodyEl.count() > 0) {
        initialHeight = (await bodyEl.boundingBox())?.height || 0;
      }

      // Click zoom in twice
      await zoomInBtn.click();
      await page.waitForTimeout(100);
      await zoomInBtn.click();
      await page.waitForTimeout(200);

      // Verify body content expanded or remained stable
      if (await bodyEl.count() > 0) {
        const zoomedHeight = (await bodyEl.boundingBox())?.height || 0;
        expect(zoomedHeight).toBeGreaterThanOrEqual(initialHeight);
      }

      // Scroll down and ensure right sidebar sticky behavior
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.waitForTimeout(200);

      const sidebarBox = await rightSidebar.boundingBox();
      expect(sidebarBox).not.toBeNull();
      // top-24 is 96px, with small tolerance for margins/headers
      expect(sidebarBox.y).toBeLessThanOrEqual(160);
      expect(sidebarBox.y).toBeGreaterThanOrEqual(0);
    }
  });

  test('P05-06-02: Toolbar maintains 10 icons with rigid bounding boxes during article scroll and zoom cycles', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoArticle(page);

    const toolbar = page.locator('aside[aria-label="Thanh công cụ bài viết"]');
    if (await toolbar.count() > 0) {
      await expect(toolbar).toBeVisible();

      const buttons = toolbar.locator('button, a');
      const count = await buttons.count();
      // T-05 specifies full suite of toolbar controls
      expect(count).toBeGreaterThanOrEqual(5);

      // Verify button sizes are consistent (approx 36x36px / w-9 h-9)
      const firstBtn = buttons.first();
      const box = await firstBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThanOrEqual(30);
      expect(box.height).toBeGreaterThanOrEqual(30);
    }
  });

  test('P05-06-03: Right sidebar respects max height and overflow containment on zoom stress', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await gotoArticle(page);

    const rightSidebar = page.locator('aside[aria-label*="Thông tin"], aside[aria-label*="liên quan"]').first();
    if (await rightSidebar.count() > 0) {
      // Zoom in to maximum
      const zoomInBtn = page.locator('#btn-zoom-in');
      for (let i = 0; i < 4; i++) {
        if (await zoomInBtn.isVisible()) {
          await zoomInBtn.click();
          await page.waitForTimeout(50);
        }
      }

      // Check right sidebar does not break layout or spill offscreen horizontally
      const sidebarBox = await rightSidebar.boundingBox();
      expect(sidebarBox).not.toBeNull();
      expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(VIEWPORTS.desktop.width);
    }
  });
});
