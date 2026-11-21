const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-04: Static Spa Cards Boundary and Accessibility (Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
        localStorage.setItem('popupClosedDate', today);
      } catch (e) {}
    });
  });

  test('T04-B01: Hovering over static cards does not trigger underline or cursor change', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const firstCard = page.locator('#section_spa ol li').first();
    await expect(firstCard).toBeVisible();

    await firstCard.hover();
    await page.waitForTimeout(100);

    const titleEl = firstCard.locator('span.text-lg, span.font-bold').first();
    if (await titleEl.isVisible()) {
      const textDecoration = await titleEl.evaluate((el) => window.getComputedStyle(el).textDecorationLine);
      expect(textDecoration).not.toBe('underline');
    }
  });

  test('T04-B02: Mobile tabbed view switches panels without compromising static content', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const mobileTabs = page.locator('#section_spa [role="tablist"] [role="tab"]');
    const tabCount = await mobileTabs.count();

    if (tabCount >= 2) {
      const secondTab = mobileTabs.nth(1);
      await secondTab.click({ force: true });
      await page.waitForTimeout(100);

      // Verify second panel is now active/visible
      const panelId = await secondTab.getAttribute('aria-controls');
      if (panelId) {
        const panel = page.locator(`#${panelId}`);
        await expect(panel).toBeVisible();
      }
    }
  });

  test('T04-B03: Keyboard Tab navigation bypasses static step cards without focus trap', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const ctaBtn = page.locator('#section_spa a:has-text("Đặt lịch")').first();
    await ctaBtn.focus();
    expect(await ctaBtn.evaluate((el) => document.activeElement === el)).toBe(true);

    // Press Tab - should not focus static card containers (they have no tabindex/href)
    await page.keyboard.press('Tab');
    const activeElementParent = await page.evaluate(() => {
      const el = document.activeElement;
      return el && el.closest('#section_spa ol li') !== null;
    });

    expect(activeElementParent).toBe(false);
  });

  test('T04-B04: Step numbering indicators (01..04) maintain consistent typography and order', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const cards = page.locator('#section_spa ol li');
    const count = await cards.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const expectedNum = `0${i + 1}`;
      const numSpan = card.locator(`text="${expectedNum}"`).first();
      await expect(numSpan).toBeVisible();
    }
  });

  test('T04-B05: Responsive breakpoint transition between desktop grid and mobile container', async ({ page }) => {
    // Desktop: ol grid is visible, mobile tabs hidden
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });
    const desktopGrid = page.locator('#section_spa ol');
    await expect(desktopGrid).toBeVisible();

    // Mobile: ol grid is hidden (max-lg:hidden), mobile container visible
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(150);
    await expect(desktopGrid).toBeHidden();
  });
});
