const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('Tier 3: Pair T-15 & T-17 - Governance, Regulatory Compliance & Brand Authenticity', () => {
  test('P15-17-01: About-Us team section strictly enforces RULE-P0-02 (no "Bác sĩ" term)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const teamSection = page.locator('#about-team');
    if (await teamSection.count() > 0) {
      const text = await teamSection.innerText();
      // Verbatim violation checks
      expect(text).not.toMatch(/\bbác\s*sĩ\b/i);
      expect(text).not.toMatch(/\bbs\.\b/i);
      expect(text).not.toMatch(/\bbac\s*si\b/i);

      // Must use approved roles
      expect(text).toMatch(/chuyên gia|giám đốc|dược sĩ|cố vấn/i);
    }
  });

  test('P15-17-02: Brand page displays authentic import commitments without artificial deal countdowns', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.brand);

    // Verify presence of genuine trust badges
    const pageText = await page.innerText('body');
    expect(pageText).toMatch(/chính hãng|thương hiệu|nhập khẩu/i);

    // Ensure no fake urgent countdowns or deceptive patterns
    expect(pageText).not.toMatch(/chỉ còn \d+ giây/i);
    expect(pageText).not.toMatch(/sắp cháy hàng trong \d+ phút/i);
  });

  test('P15-17-03: Regulatory compliance is upheld across both desktop and mobile viewports', async ({ page }) => {
    for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(vpSize);
      await page.goto(ROUTES.about);

      const teamSection = page.locator('#about-team');
      if (await teamSection.count() > 0) {
        const text = await teamSection.innerText();
        expect(text, `Failed on ${vpName}`).not.toMatch(/\bbác\s*sĩ\b/i);
      }
    }
  });
});
