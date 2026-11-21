const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-04: Static 4 Cards in #section_spa on Homepage (Tier 1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
        localStorage.setItem('popupClosedDate', today);
      } catch (e) {}
    });
  });

  test('T04-01: Section #section_spa exists on homepage with 4 cards', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const spaSection = page.locator('#section_spa');
    await expect(spaSection).toBeAttached();

    const desktopCards = page.locator('#section_spa ol li');
    const count = await desktopCards.count();
    expect(count).toBe(4);
  });

  test('T04-02: Step cards are static blocks without outer anchor <a> tags', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const desktopCards = page.locator('#section_spa ol li');
    const count = await desktopCards.count();

    for (let i = 0; i < count; i++) {
      const card = desktopCards.nth(i);
      // Ensure the card container is NOT an <a> tag
      const tagName = await card.evaluate((el) => {
        const directChild = el.firstElementChild;
        return directChild ? directChild.tagName.toLowerCase() : el.tagName.toLowerCase();
      });
      expect(tagName).not.toBe('a');

      // Also ensure no full-card anchor wraps the step card
      const linkCount = await card.locator('> a').count();
      expect(linkCount).toBe(0);
    }
  });

  test('T04-03: Step cards do not display pointer cursor', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const firstCard = page.locator('#section_spa ol li').first();
    await expect(firstCard).toBeVisible();

    const cursor = await firstCard.evaluate((el) => {
      const child = el.firstElementChild || el;
      return window.getComputedStyle(child).cursor;
    });

    expect(cursor).not.toBe('pointer');
  });

  test('T04-04: Left column preserves appointment booking CTA button', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const ctaBtn = page.locator('#section_spa a:has-text("Đặt lịch")').first();
    await expect(ctaBtn).toBeVisible();

    const href = await ctaBtn.getAttribute('href');
    expect(href).not.toBeNull();
    expect(href.length).toBeGreaterThan(0);
  });

  test('T04-05: Left column preserves service chips and tags', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    const chipsList = page.locator('#section_spa ul li');
    const count = await chipsList.count();
    expect(count).toBeGreaterThan(0);

    const firstChip = chipsList.first();
    await expect(firstChip).toBeVisible();
    const text = await firstChip.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});
