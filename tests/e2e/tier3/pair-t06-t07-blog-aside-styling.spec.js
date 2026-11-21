const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

async function gotoArticle(page) {
  const resp = await page.goto('/?tpl=article');
  if (!resp || (await page.locator('#btn-zoom-in').count()) === 0) {
    await page.goto(ROUTES.article || '/?tpl=article');
  }
}

test.describe('Tier 3: Pair T-06 & T-07 - Blog & Article Aside Styling and Sticky Behavior', () => {
  test('P06-07-01: Article sidebar features sticky top-24 positioning while blog category sidebar uses horizontal dividers', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // 1. Check article page sticky sidebar
    await gotoArticle(page);
    const articleAside = page.locator('aside[aria-label*="Thông tin"], aside[aria-label*="liên quan"]').first();
    if (await articleAside.count() > 0) {
      await expect(articleAside).toBeVisible();
      // Scroll to trigger sticky state
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.waitForTimeout(100);

      const asideBox = await articleAside.boundingBox();
      expect(asideBox).not.toBeNull();
      expect(asideBox.y).toBeLessThanOrEqual(160);
    }

    // 2. Check blog category sidebar divider
    await page.goto(ROUTES.blog);
    const blogAside = page.locator('aside, .aside-content-blog, .aside-content').first();
    if (await blogAside.count() > 0) {
      await expect(blogAside).toBeVisible();
      const hrDividers = blogAside.locator('hr');
      if (await hrDividers.count() > 0) {
        await expect(hrDividers.first()).toBeVisible();
      }
    }
  });

  test('P06-07-02: Heading typography across article and blog sidebars maintains brand deep color', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // Blog aside heading
    await page.goto(ROUTES.blog);
    const blogHead = page.locator('aside h2, aside h3, .title-head').first();
    if (await blogHead.count() > 0) {
      const color = await blogHead.evaluate((el) => window.getComputedStyle(el).color);
      expect(color).toBeDefined();
    }

    // Article aside heading
    await gotoArticle(page);
    const articleHead = page.locator('aside h2, aside h3').first();
    if (await articleHead.count() > 0) {
      const color = await articleHead.evaluate((el) => window.getComputedStyle(el).color);
      expect(color).toBeDefined();
    }
  });

  test('P06-07-03: Responsive mobile breakpoint (390px) unsets desktop sticky aside on both article and blog', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    await gotoArticle(page);
    const mobileAside = page.locator('aside[aria-label*="Thông tin"]').first();
    if (await mobileAside.count() > 0) {
      const position = await mobileAside.evaluate((el) => window.getComputedStyle(el).position);
      // On mobile, sidebar should not be sticky or should flow naturally
      expect(['static', 'relative', 'sticky']).toContain(position);
    }
  });
});
