// Capture the local preview after loading product carousels and images.
const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const folder = 'design/home-portal-v3';
  fs.mkdirSync(folder, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: '#dev-toolbar{display:none!important}' });
      await page.evaluate(() => document.fonts.ready);
      for (const id of ['section_flash_sale', 'section_featured_products', 'section_spa', 'section_testimonials', 'section_portal_blog', 'section_portal_social']) {
        await page.locator('#' + id).scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
      }
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${folder}/${name}.png`, fullPage: true });
      await page.screenshot({ path: `${folder}/hero-${name}.png` });
      if (name === 'desktop') {
        await page.locator('.swiper_sale').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${folder}/products-desktop.png` });
      }
    }
    console.log(`Saved preview screenshots to ${folder}`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
