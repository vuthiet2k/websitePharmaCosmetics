const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('Tier 4: Scenario 2 - Clinical Trust & Brand Authority Journey', () => {
  test('SC02-01: Full user journey across About Us: Stats strip -> Brand-tint cards -> Team governance -> Ingredient marquee', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    // Step 1: Page header & Hero badge
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    // Step 2: Stats strip inspection (T-12)
    const statsSection = page.locator('section').filter({ hasText: /10\+|400\+|thương hiệu|kinh nghiệm/i }).first();
    await expect(statsSection).toBeVisible();

    const statNum = statsSection.locator('.text-3xl, .font-heading, .font-extrabold, strong').first();
    if (await statNum.count() > 0) {
      await expect(statNum).toBeVisible();
      const fontWeight = await statNum.evaluate((el) => window.getComputedStyle(el).fontWeight);
      expect(parseInt(fontWeight, 10) || 700).toBeGreaterThanOrEqual(600);
    }

    // Step 3: Scroll down through Sứ mệnh & Quy trình (T-13)
    const methodSection = page.locator('#about-method, #about-mission').first();
    if (await methodSection.count() > 0) {
      await methodSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);

      // Verify circular badges
      const circleBadge = methodSection.locator('.rounded-full, .rounded-xl').first();
      if (await circleBadge.count() > 0) {
        await expect(circleBadge).toBeVisible();
      }
    }

    // Step 4: Governance audit of Team section (T-15, RULE-P0-02)
    const teamSection = page.locator('#about-team');
    if (await teamSection.count() > 0) {
      await teamSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);

      const teamText = await teamSection.innerText();
      // Zero occurrences of "Bác sĩ"
      expect(teamText).not.toMatch(/\bbác\s*sĩ\b/i);
      expect(teamText).not.toMatch(/\bbs\.\b/i);
      // Valid expert roles
      expect(teamText).toMatch(/chuyên gia|giám đốc|dược sĩ|cố vấn/i);
    }

    // Step 5: Ingredient marquee verification (T-16)
    const ingSection = page.locator('#about-ing');
    if (await ingSection.count() > 0) {
      await ingSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);

      // Verify multiple ingredients loaded
      const items = ingSection.locator('a, span');
      expect(await items.count()).toBeGreaterThanOrEqual(10);

      // Hover to trigger pause
      const marqueeEl = ingSection.locator('.overflow-hidden, [class*="marquee"]').first();
      if (await marqueeEl.count() > 0) {
        await marqueeEl.hover();
        await page.waitForTimeout(100);
      }
    }
  });

  test('SC02-02: Reduced motion and accessibility audit across clinical trust components', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTES.about);

    // Verify stats and middle content are rendered immediately with full opacity
    const aboutContent = page.locator('#about-story, #about-mission, #about-team').first();
    if (await aboutContent.count() > 0) {
      const opacity = await aboutContent.evaluate((el) => window.getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeGreaterThanOrEqual(0.9);
    }

    // Verify side rail navigation on desktop
    const railNav = page.locator('#aboutRail, nav[aria-label*="Về chúng tôi"]');
    if (await railNav.count() > 0) {
      await expect(railNav.first()).toBeVisible();
      const railLinks = railNav.first().locator('a');
      expect(await railLinks.count()).toBeGreaterThanOrEqual(2);
    }
  });
});
