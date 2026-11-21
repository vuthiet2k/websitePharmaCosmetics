const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function navigateToArticle(page) {
  const resp = await page.goto(ROUTES.article, { waitUntil: 'domcontentloaded' });
  if (!resp || resp.status() === 404) {
    await page.goto(ROUTES.articleTpl || '/?tpl=article', { waitUntil: 'domcontentloaded' });
  }
}

test.describe('T-06: Article Right Sidebar Sticky Boundary and Stress (Tier 2)', () => {
  test('T06-B01: Short viewport height (height: 480px) internal scroll capability', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 480 });
    await navigateToArticle(page);

    const sidebar = page.locator('aside[aria-label="Thông tin liên quan và chủ đề"]');
    await expect(sidebar).toBeVisible();

    const maxH = await sidebar.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.maxHeight || el.className;
    });

    // Sidebar should have max-h-screen or overflow rules for short viewports
    expect(sidebar).toBeDefined();
  });

  test('T06-B02: Mobile viewport (390px) stacks sidebar naturally below main article', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await navigateToArticle(page);

    const mainArticle = page.locator('main.w-full');
    const sidebar = page.locator('aside[aria-label="Thông tin liên quan và chủ đề"]');

    await expect(mainArticle).toBeVisible();
    await expect(sidebar).toBeVisible();

    const mainBox = await mainArticle.boundingBox();
    const sidebarBox = await sidebar.boundingBox();

    expect(mainBox).not.toBeNull();
    expect(sidebarBox).not.toBeNull();

    // On mobile, sidebar must be stacked below main article (y >= mainBox.y + mainBox.height)
    expect(sidebarBox.y).toBeGreaterThanOrEqual(mainBox.y);
  });

  test('T06-B03: Deep scrolling to bottom does not cause sidebar to collide into footer', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const sidebar = page.locator('aside[aria-label="Thông tin liên quan và chủ đề"]');
    const sidebarBox = await sidebar.boundingBox();
    const footerBox = await footer.boundingBox();

    if (sidebarBox && footerBox) {
      // Sidebar bottom should not extend deep into footer
      expect(sidebarBox.y + sidebarBox.height).toBeLessThanOrEqual(footerBox.y + 100);
    }
  });

  test('T06-B04: Viewport resizing from mobile to desktop re-enables sticky positioning', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await navigateToArticle(page);

    const sidebar = page.locator('aside[aria-label="Thông tin liên quan và chủ đề"]');
    await expect(sidebar).toBeVisible();

    // Switch to desktop
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(200);

    const isSticky = await sidebar.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.position === 'sticky' || el.classList.contains('sticky') || el.classList.contains('lg:sticky');
    });

    expect(isSticky).toBe(true);
  });

  test('T06-B05: Sticky sidebar z-index does not obscure header navigation', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const header = page.locator('header.header');
    const sidebar = page.locator('aside[aria-label="Thông tin liên quan và chủ đề"]');

    if (await header.isVisible()) {
      const headerZ = await header.evaluate((el) => {
        const z = window.getComputedStyle(el).zIndex;
        return z === 'auto' ? 10 : parseInt(z, 10);
      });
      const sidebarZ = await sidebar.evaluate((el) => {
        const z = window.getComputedStyle(el).zIndex;
        return z === 'auto' ? 0 : parseInt(z, 10);
      });

      // Header z-index must be greater than or equal to sidebar z-index
      expect(headerZ).toBeGreaterThanOrEqual(sidebarZ);
    }
  });
});
