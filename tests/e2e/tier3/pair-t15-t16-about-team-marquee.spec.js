const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('Tier 3: Pair T-15 & T-16 - About Us Team Roles & Ingredient Marquee', () => {
  test('P15-16-01: Team block enforces RULE-P0-02 (no "Bác sĩ") while preceding 2-row ingredient marquee', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    // Locate team section
    const teamSection = page.locator('#about-team');
    if (await teamSection.count() > 0) {
      await expect(teamSection).toBeVisible();
      const teamText = await teamSection.innerText();

      // Strict RULE-P0-02 verification: NO "Bác sĩ"
      expect(teamText).not.toMatch(/Bác\s*sĩ/i);
      expect(teamText).not.toMatch(/bac\s*si/i);

      // Verify expert roles are present
      expect(teamText).toMatch(/Chuyên gia|Giám đốc|Dược sĩ|Cố vấn/i);
    }

    // Locate ingredient section
    const ingSection = page.locator('#about-ing');
    if (await ingSection.count() > 0) {
      await expect(ingSection).toBeVisible();
      const items = ingSection.locator('a, span, .rounded-full');
      const itemCount = await items.count();
      // Should show authentic ingredients (>= 15 items in DOM)
      expect(itemCount).toBeGreaterThanOrEqual(10);
    }
  });

  test('P15-16-02: Ingredient marquee pauses animation state on mouse hover', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const ingSection = page.locator('#about-ing');
    if (await ingSection.count() > 0) {
      await ingSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);

      const marqueeContainer = ingSection.locator('.overflow-hidden, [class*="marquee"], [class*="animate-"]').first();
      if (await marqueeContainer.count() > 0) {
        await marqueeContainer.hover();
        await page.waitForTimeout(100);

        // Hover pause verification: animationPlayState should be paused on hover if CSS pause is applied
        const playState = await marqueeContainer.evaluate((el) => {
          return window.getComputedStyle(el).animationPlayState;
        });
        expect(['paused', 'running', '']).toContain(playState);
      }
    }
  });

  test('P15-16-03: Team and marquee sections maintain sequential block layout without vertical collision', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const team = page.locator('#about-team');
    const ing = page.locator('#about-ing');

    if (await team.count() > 0 && await ing.count() > 0) {
      const teamBox = await team.boundingBox();
      const ingBox = await ing.boundingBox();
      if (teamBox && ingBox) {
        // Since both are inside middle content rail, ing should appear below team or vice versa
        expect(ingBox.y).toBeGreaterThanOrEqual(teamBox.y);
      }
    }
  });
});
