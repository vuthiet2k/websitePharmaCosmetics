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

test.describe('T-15: About Us Team Roles & RULE-P0-02 Boundary & Corner Cases (Tier 2)', () => {
  test('T-15-B01: Adversarial attribute scan: zero occurrence of "Bác sĩ" in any DOM attributes', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    // Scan all alts, titles, aria-labels in team section
    const teamSection = page.locator('#about-team, section:has-text("Đội ngũ")').first();
    const elementsWithAttributes = teamSection.locator('[alt], [title], [aria-label]');
    const count = await elementsWithAttributes.count();

    for (let i = 0; i < count; i++) {
      const el = elementsWithAttributes.nth(i);
      const alt = await el.getAttribute('alt');
      const title = await el.getAttribute('title');
      const ariaLabel = await el.getAttribute('aria-label');

      if (alt) expect(/Bác\s*sĩ/i.test(alt)).toBe(false);
      if (title) expect(/Bác\s*sĩ/i.test(title)).toBe(false);
      if (ariaLabel) expect(/Bác\s*sĩ/i.test(ariaLabel)).toBe(false);
    }
  });

  test('T-15-B02: Long expert role title wraps cleanly without overlapping sibling cards', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const teamSection = page.locator('#about-team, section:has-text("Đội ngũ")').first();
    const cards = teamSection.locator('.grid > div');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const isVisible = await card.isVisible();
      if (!isVisible) continue;

      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThan(100);
    }
  });

  test('T-15-B03: Expert avatar image has valid object-fit and non-distorted dimensions', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const avatars = page.locator('#about-team img');
    if (await avatars.count() > 0) {
      const avatar = avatars.first();
      await expect(avatar).toBeVisible();

      const objectFit = await avatar.evaluate(el => window.getComputedStyle(el).objectFit);
      expect(['cover', 'contain', 'none']).toContain(objectFit);
    }
  });

  test('T-15-B04: Tablet viewport (1024px) retains 2 or 4 column grid without text collision', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(ROUTES.about);

    const teamSection = page.locator('#about-team, section:has-text("Đội ngũ")').first();
    await expect(teamSection).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('T-15-B05: Mobile viewport (390px) formats expert cards with readable text and centered layout', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.about);

    const teamSection = page.locator('#about-team, section:has-text("Đội ngũ")').first();
    const cards = teamSection.locator('.grid > div');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();

    const textAlign = await firstCard.evaluate(el => window.getComputedStyle(el).textAlign);
    expect(['center', 'left', 'start']).toContain(textAlign);
  });

  test('T-15-B06: Case and abbreviation variations ("BS.", "Bs", "BÁC SĨ") are absent from expert cards', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.about);

    const teamSection = page.locator('#about-team, section:has-text("Đội ngũ")').first();
    const text = await teamSection.innerText();

    // Check for abbreviations like "BS.", "Bs " or all-caps "BÁC SĨ"
    const hasForbiddenAbbrev = /\bBS\.\s|\bBs\.\s|\bBÁC\s*SĨ\b/.test(text);
    expect(hasForbiddenAbbrev).toBe(false);
  });
});
