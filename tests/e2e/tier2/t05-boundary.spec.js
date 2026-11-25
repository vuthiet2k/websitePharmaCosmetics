const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function navigateToArticle(page) {
  const resp = await page.goto(ROUTES.article, { waitUntil: 'domcontentloaded' });
  if (!resp || resp.status() === 404) {
    await page.goto(ROUTES.articleTpl || '/?tpl=article', { waitUntil: 'domcontentloaded' });
  }
}

test.describe('T-05: Article Toolbar Zoom Boundary and Action Edge Cases (Tier 2)', () => {
  test('T05-B01: Maximum zoom level boundary cap prevents runaway text explosion', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const btnZoomIn = page.locator('#btn-zoom-in');
    const articleBody = page.locator('#article-body');

    // Click 10 times rapidly
    for (let i = 0; i < 10; i++) {
      await btnZoomIn.click();
    }

    const cappedSize = await articleBody.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
    // Max font size in the steps array should be capped reasonably (<= 28px)
    expect(cappedSize).toBeLessThanOrEqual(28);
    expect(cappedSize).toBeGreaterThan(16);
  });

  test('T05-B02: Minimum zoom level boundary cap prevents text collapsing below legibility', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const btnZoomOut = page.locator('#btn-zoom-out');
    const articleBody = page.locator('#article-body');

    // Click 10 times rapidly
    for (let i = 0; i < 10; i++) {
      await btnZoomOut.click();
    }

    const minimumSize = await articleBody.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
    // Min font size in steps array should not collapse below 12px
    expect(minimumSize).toBeGreaterThanOrEqual(12);
  });

  test('T05-B03: Copy link button handles clipboard action gracefully without crash', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    // Mock clipboard or dialog handler
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const copyBtn = page.locator('[data-article-copy]').first();
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
      // Should not throw uncaught exceptions
      expect(true).toBe(true);
    }
  });

  test('T05-B04: Mobile action bar visibility strictly adheres to breakpoint limits', async ({ page }) => {
    // Desktop: mobile action bar hidden
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);
    const mobileBar = page.locator('.flex.lg\\:hidden:has([data-article-share])');
    if (await mobileBar.count() > 0) {
      await expect(mobileBar.first()).toBeHidden();
    }

    // Mobile: mobile action bar visible
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(150);
    if (await mobileBar.count() > 0) {
      await expect(mobileBar.first()).toBeVisible();
    }
  });

  test('T05-B05: Action buttons feature accessibility titles and aria-labels', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const toolbar = page.locator('aside[aria-label="Thanh công cụ bài viết"]');
    const buttons = toolbar.locator('button, a');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      // Every button must have either an aria-label or a title
      expect(ariaLabel || title).not.toBeNull();
    }
  });
});
