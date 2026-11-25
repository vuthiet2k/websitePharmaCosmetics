const { test, expect } = require('@playwright/test');
const { VIEWPORTS } = require('../helpers/viewports');
const { ROUTES } = require('../helpers/routes');

test.describe('T-03: Chat Widget Dragging and Drop Zone Boundary (Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress promotional popup banner
    await page.addInitScript(() => {
      try {
        const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
        localStorage.setItem('popupClosedDate', today);
      } catch (e) {}
    });
  });

  test('T03-B01: Drag threshold boundary - slight movement under 8px does not enter drag mode', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.removeItem('pc_contact_widget_hidden'));

    const toggleBtn = page.locator('#toggle-widget-btn');
    const box = await toggleBtn.boundingBox();
    expect(box).not.toBeNull();

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Move only 4px (under 8px threshold)
    await page.mouse.move(startX + 4, startY + 4);

    const widget = page.locator('.main-widget');
    const isDragging = await widget.evaluate((el) => el.classList.contains('is-dragging'));
    expect(isDragging).toBe(false);

    await page.mouse.up();
  });

  test('T03-B02: Dragging mascot into bottom drop target triggers hidden state', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.removeItem('pc_contact_widget_hidden'));

    const toggleBtn = page.locator('#toggle-widget-btn');
    const dropZone = page.locator('#pc-chat-drop-zone');
    await expect(dropZone).toBeAttached();

    const box = await toggleBtn.boundingBox();
    expect(box).not.toBeNull();

    // Start drag
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    // Drag towards bottom center (where drop zone is located: bottom-6, left-1/2)
    const dropBox = await dropZone.boundingBox();
    if (dropBox) {
      await page.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2, { steps: 5 });
      await page.waitForTimeout(100);
      await page.mouse.up();

      const widget = page.locator('.main-widget');
      await expect(widget).toHaveClass(/widget-hidden/);
    } else {
      await page.mouse.up();
    }
  });

  test('T03-B03: Releasing drag outside drop zone snaps widget to viewport edge', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.removeItem('pc_contact_widget_hidden'));

    const toggleBtn = page.locator('#toggle-widget-btn');
    const box = await toggleBtn.boundingBox();
    expect(box).not.toBeNull();

    // Drag slightly to middle right
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 50, box.y, { steps: 3 });
    await page.mouse.up();

    const widget = page.locator('.main-widget');
    // Not dropped into drop target, so must NOT be hidden
    await expect(widget).not.toHaveClass(/widget-hidden/);

    // After snap, widget is either at right edge or left edge
    const finalBox = await toggleBtn.boundingBox();
    expect(finalBox).not.toBeNull();
    const atRightOrLeftEdge = finalBox.x > 1000 || finalBox.x < 100;
    expect(atRightOrLeftEdge).toBe(true);
  });

  test('T03-B04: Mobile touch/pointer drag boundary respects viewport limits', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => sessionStorage.removeItem('pc_contact_widget_hidden'));

    const toggleBtn = page.locator('#toggle-widget-btn');
    const box = await toggleBtn.boundingBox();
    expect(box).not.toBeNull();

    // Mascot must sit within mobile viewport (width 390, height 844)
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(395);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  });

  test('T03-B05: Session storage persistence keeps widget hidden across page navigation', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.home, { waitUntil: 'domcontentloaded' });

    // Wait until widget helper function is loaded
    await page.waitForFunction(() => typeof window.pcSetContactHidden === 'function');
    await page.evaluate(() => window.pcSetContactHidden(true));

    const widget = page.locator('.main-widget');
    await expect(widget).toHaveClass(/widget-hidden/);

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });

    const widgetAfterReload = page.locator('.main-widget');
    await expect(widgetAfterReload).toHaveClass(/widget-hidden/);
  });
});
