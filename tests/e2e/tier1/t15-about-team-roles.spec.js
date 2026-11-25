const { test, expect } = require('@playwright/test');

let VIEWPORTS;
let ROUTES;
try {
  VIEWPORTS = require('../helpers/viewports').VIEWPORTS;
} catch {
  VIEWPORTS = {
    desktop: { width: 1440, height: 900 },
    tablet: { width: 1024, height: 768 },
    mobile: { width: 390, height: 844 },
  };
}
try {
  ROUTES = require('../helpers/routes').ROUTES;
} catch {
  ROUTES = {
    about: '/about-us',
  };
}

test.describe('T-15: About Us Team Roles & RULE-P0-02 Compliance (Tier 1)', () => {
  test('T-15-01: Team / Expert section is rendered on About Us page', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const teamSection = page.locator('#about-team, section:has-text("Đội ngũ"), section:has-text("Chuyên gia")').first();
    await expect(teamSection).toBeVisible();

    const expertCards = teamSection.locator('.grid > div, [class*="expert-card"]');
    const count = await expertCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('T-15-02: Expert roles display "Chuyên gia" terminology prominently', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const teamSection = page.locator('#about-team, section:has-text("Đội ngũ"), section:has-text("Chuyên gia")').first();
    const textContent = await teamSection.textContent();

    expect(textContent).toMatch(/Chuyên gia/i);
  });

  test('T-15-03: Strictly ZERO occurrence of forbidden term "Bác sĩ" in entire About page DOM', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const bodyText = await page.locator('body').innerText();
    const hasDoctorTerm = /Bác\s*sĩ|bác\s*sĩ|Bác\s*Sĩ|BAC\s*SI/i.test(bodyText);
    expect(hasDoctorTerm).toBe(false);
  });

  test('T-15-04: Expert role titles are emphasized and personal doctor names are not exposed as titles', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const teamSection = page.locator('#about-team, section:has-text("Đội ngũ")').first();
    const headings = teamSection.locator('h3, h4, .font-bold');
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const headingText = (await headings.nth(i).textContent()).trim();
      expect(/Bác\s*sĩ/i.test(headingText)).toBe(false);
    }
  });

  test('T-15-05: Expert cards display qualification and specialization descriptions', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const teamSection = page.locator('#about-team, section:has-text("Đội ngũ")').first();
    const descriptions = teamSection.locator('p');
    const count = await descriptions.count();
    expect(count).toBeGreaterThan(0);

    const firstDesc = descriptions.first();
    await expect(firstDesc).toBeVisible();
    const descText = await firstDesc.textContent();
    expect(descText.trim().length).toBeGreaterThan(0);
    expect(/Bác\s*sĩ/i.test(descText)).toBe(false);
  });

  test('T-15-06: Mobile viewport (390px) formats expert cards responsively without horizontal cutoff', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.about);

    const teamSection = page.locator('#about-team, section:has-text("Đội ngũ")').first();
    await expect(teamSection).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
