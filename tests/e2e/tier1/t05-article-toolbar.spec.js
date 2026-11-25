const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function navigateToArticle(page) {
  const resp = await page.goto(ROUTES.article, { waitUntil: 'domcontentloaded' });
  if (!resp || resp.status() === 404) {
    await page.goto(ROUTES.articleTpl || '/?tpl=article', { waitUntil: 'domcontentloaded' });
  }
}

test.describe('T-05: Article Toolbar Zoom Buttons and Icons (Tier 1)', () => {
  test('T05-01: Button #btn-zoom-in displays plus character matching #btn-zoom-out', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const btnZoomIn = page.locator('#btn-zoom-in');
    const btnZoomOut = page.locator('#btn-zoom-out');

    await expect(btnZoomIn).toBeVisible();
    await expect(btnZoomOut).toBeVisible();

    const inText = await btnZoomIn.innerText();
    const outText = await btnZoomOut.innerText();

    // Verify + and - characters are present
    expect(inText.trim()).toMatch(/\+/);
    expect(outText.trim()).toMatch(/[−\-]/);
  });

  test('T05-02: Clicking #btn-zoom-in increases article body font size', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const articleBody = page.locator('#article-body');
    await expect(articleBody).toBeVisible();

    const initialSize = await articleBody.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    const btnZoomIn = page.locator('#btn-zoom-in');
    await btnZoomIn.click();

    const newSize = await articleBody.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    expect(newSize).toBeGreaterThan(initialSize);
  });

  test('T05-03: Clicking #btn-zoom-out decreases article body font size', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const articleBody = page.locator('#article-body');
    const btnZoomIn = page.locator('#btn-zoom-in');
    const btnZoomOut = page.locator('#btn-zoom-out');

    // Zoom in first to ensure we can zoom out
    await btnZoomIn.click();
    const enlargedSize = await articleBody.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));

    await btnZoomOut.click();
    const reducedSize = await articleBody.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));

    expect(reducedSize).toBeLessThan(enlargedSize);
  });

  test('T05-04: Clicking #btn-zoom-reset restores default font size', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const articleBody = page.locator('#article-body');
    const initialSize = await articleBody.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));

    const btnZoomIn = page.locator('#btn-zoom-in');
    await btnZoomIn.click();

    const btnReset = page.locator('#btn-zoom-reset');
    await expect(btnReset).toBeVisible();
    await btnReset.click();

    const resetSize = await articleBody.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
    expect(resetSize).toBe(initialSize);
  });

  test('T05-05: Desktop article toolbar contains standard sized action buttons', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToArticle(page);

    const toolbar = page.locator('aside[aria-label="Thanh công cụ bài viết"]');
    await expect(toolbar).toBeVisible();

    // Verify presence of core action buttons
    const buttons = toolbar.locator('button, a');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(6);

    // Verify button dimensions are standard ~36x36px (w-9 h-9)
    const firstBtn = buttons.first();
    const box = await firstBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeCloseTo(36, 1);
    expect(box.height).toBeCloseTo(36, 1);
  });
});
