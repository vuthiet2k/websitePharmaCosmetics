const { test, expect } = require('@playwright/test');
const { Liquid } = require('liquidjs');
const path = require('path');
const fs = require('fs');

const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '../../configs/settings_data.json'), 'utf8')).current;
const engine = new Liquid({ root: path.join(__dirname, '../../snippets'), extname: '.bwt' });

async function openHome(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.pc-portal')).toBeVisible();
  return errors;
}

test('v3 typography, section order and real destinations', async ({ page }) => {
  const errors = await openHome(page);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.hero h1')).toHaveCSS('font-family', /Fraunces/);
  await expect(page.locator('.pc-portal')).not.toContainText('GPKD 0109xxxxxx');
  expect(await page.locator('.pc-portal a[href="#"]').count()).toBe(0);
  const ids = await page.locator('.portal-section').evaluateAll(nodes => nodes.map(n => n.id));
  expect(ids).toEqual(Array.from({ length: 18 }, (_, i) => settings[`home_section_${i+1}`]).filter(s => s !== 'none'));
  await page.getByRole('link', { name: 'Chọn theo vấn đề da', exact: true }).click();
  await expect(page).toHaveURL(/#section_solutions$/);
  await expect(page.locator('.concerns a')).toHaveCount(6);
  await expect(page.locator('.actives a')).toHaveCount(9);
  await expect(page.locator('.post-lead')).toHaveAttribute('href', /\S+/);
  expect(errors).toEqual([]);
});

test('hero uses a stable full-background fade while copy and CTA stay static', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors = await openHome(page);
  const hero = page.locator('[data-portal-hero]');
  await expect(hero).toHaveCSS('position', 'relative');
  expect(await hero.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(560);
  await expect(hero.locator('.portal-hero__media')).toHaveCSS('position', 'absolute');
  await expect(hero.locator('.portal-hero__content')).toHaveCSS('z-index', '2');
  const copy = hero.locator('.portal-hero__copy');
  await expect(copy).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.88)');
  await expect(copy).toHaveCSS('backdrop-filter', /blur\(14px\)/);
  const centerOffset = await copy.evaluate(el => {
    const copyRect = el.getBoundingClientRect();
    const heroRect = el.closest('.hero').getBoundingClientRect();
    return Math.abs((copyRect.left + copyRect.width / 2) - (heroRect.left + heroRect.width / 2));
  });
  expect(centerOffset).toBeLessThan(1.5);
  await expect(hero.locator('h1')).toHaveCSS('color', 'rgb(0, 46, 35)');
  await expect(hero.locator('.eyebrow')).toHaveCSS('color', 'rgb(60, 179, 113)');
  await expect(hero.locator('.sub')).toHaveCSS('color', 'rgb(78, 101, 96)');
  await expect(hero.locator('.portal-hero__media h1')).toHaveCount(0);
  await expect(hero.getByRole('link', { name: 'Đặt lịch phân tích da →', exact: true })).toHaveAttribute('href', '/dat-lich-tu-van');
  await expect(hero.getByRole('link', { name: 'Chọn theo vấn đề da', exact: true })).toHaveAttribute('href', '#section_solutions');

  const originalSlides = hero.locator('.portal-hero__slide:not(.swiper-slide-duplicate)');
  await expect(originalSlides).toHaveCount(3);
  const heroImages = originalSlides.locator('img');
  await expect(heroImages.nth(0)).toHaveAttribute('loading', 'eager');
  await expect(heroImages.nth(0)).toHaveAttribute('fetchpriority', 'high');
  await expect(heroImages.nth(1)).toHaveAttribute('loading', 'lazy');
  await expect(heroImages.nth(1)).toHaveAttribute('fetchpriority', 'low');
  expect(await heroImages.evaluateAll(images => images.every(img => img.alt && img.getAttribute('width') === '1920' && img.getAttribute('height') === '800'))).toBeTruthy();
  expect(await heroImages.evaluateAll(images => new Set(images.map(img => img.alt)).size)).toBe(3);
  const lcpSource = await heroImages.nth(0).getAttribute('src');
  await expect(page.locator('link[rel="preload"][as="image"][fetchpriority="high"]')).toHaveAttribute('href', lcpSource);

  const slider = hero.locator('.portal-hero__media');
  const motion = await slider.evaluate(el => ({
    effect: el.swiper.params.effect,
    speed: el.swiper.params.speed,
    delay: el.swiper.params.autoplay.delay,
  }));
  expect(motion).toEqual({ effect: 'fade', speed: 700, delay: 5000 });
  await hero.hover();
  await expect.poll(() => slider.evaluate(el => el.swiper.autoplay.running)).toBe(false);
  await page.mouse.move(0, 0);
  await expect.poll(() => slider.evaluate(el => el.swiper.autoplay.running)).toBe(true);
  await hero.getByRole('link', { name: 'Đặt lịch phân tích da →', exact: true }).focus();
  await expect.poll(() => slider.evaluate(el => el.swiper.autoplay.running)).toBe(false);
  expect(errors).toEqual([]);
});

test('hero honors reduced motion and remains stable at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await openHome(page);
  const hero = page.locator('[data-portal-hero]');
  const motion = await hero.locator('.portal-hero__media').evaluate(el => ({
    speed: el.swiper.params.speed,
    running: el.swiper.autoplay.running,
  }));
  expect(motion).toEqual({ speed: 0, running: false });
  await expect(hero.locator('[data-hero-pause]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('topbar keeps accessible contrast, vector icons and a readable vertical ticker', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors = await openHome(page);
  const topbar = page.locator('.pc-topbar');
  await expect(topbar).toHaveCSS('background-color', 'rgb(30, 126, 72)');
  await expect(topbar).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(topbar).toHaveCSS('font-weight', '600');
  const originalSlides = topbar.locator('.swiper-slide:not(.swiper-slide-duplicate)');
  await expect(originalSlides).toHaveCount(2);
  await expect(originalSlides.nth(0)).toContainText('Giao Hàng Toàn Quốc');
  await expect(originalSlides.nth(1)).toContainText('Trị Liệu Da Cá Nhân Hóa Chuẩn Y Khoa');
  await expect(topbar).not.toContainText('⌄');
  await expect(topbar.locator('.pc-topbar__chevron')).toHaveCount(2);
  await expect(topbar.locator('.pc-topbar__phone .pc-topbar__icon')).toHaveCount(1);
  await expect(topbar.locator('.topbar-account-btn .pc-topbar__icon')).toHaveCount(1);
  await expect(topbar.locator('.pc-topbar__phone')).toHaveAttribute('href', 'tel:0967194063');
  const chevronOffset = await topbar.locator('#langBtn').evaluate(button => {
    const label = button.querySelector('#langLabel').getBoundingClientRect();
    const chevron = button.querySelector('.pc-topbar__chevron').getBoundingClientRect();
    return Math.abs((label.top + label.height / 2) - (chevron.top + chevron.height / 2));
  });
  expect(chevronOffset).toBeLessThan(1.5);
  await topbar.locator('#langBtn').click();
  await expect(topbar.locator('.lang-list')).toBeVisible();
  await expect(topbar.locator('.lang-list button').first()).toHaveCSS('color', 'rgb(0, 46, 35)');
  await expect(topbar.locator('.lang-list button').first()).toHaveCSS('background-color', 'rgb(232, 248, 238)');
  await topbar.locator('#langBtn').click();
  const ticker = await topbar.locator('.topbar-slider').evaluate(el => ({
    direction: el.swiper.params.direction,
    speed: el.swiper.params.speed,
    delay: el.swiper.params.autoplay.delay,
  }));
  expect(ticker).toEqual({ direction: 'vertical', speed: 600, delay: 4000 });
  await topbar.locator('.topbar-slider').hover();
  await expect.poll(() => topbar.locator('.topbar-slider').evaluate(el => el.swiper.autoplay.running)).toBe(false);
  expect(errors).toEqual([]);
});

test('topbar disables autoplay and animation when reduced motion is requested', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await openHome(page);
  const ticker = await page.locator('.topbar-slider').evaluate(el => ({
    speed: el.swiper.params.speed,
    running: el.swiper.autoplay.running,
  }));
  expect(ticker).toEqual({ speed: 0, running: false });
  await expect(page.locator('[data-topbar-pause]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(page.locator('.pc-topbar__phone')).toBeHidden();
  await expect(page.locator('.topbar-account')).toBeHidden();
  await expect(page.locator('.lang-switcher')).toBeVisible();
  expect(errors).toEqual([]);
});

test('footer uses the master logo and white content on the accessible brand background', async ({ page }) => {
  const errors = await openHome(page);
  const footer = page.locator('footer.footer');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toHaveCSS('background-color', 'rgb(0, 63, 45)');
  await expect(footer).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(footer.locator('.pc-footer-logo .pc-logo-master-svg')).toHaveCount(1);
  await expect(footer.locator('.logo-icon, .logo-text-block')).toHaveCount(0);
  await expect(footer.locator('.pc-footer-logo')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(footer.locator('.pc-footer-logo .pc-logo-master-svg path').first()).toHaveCSS('fill', 'rgb(255, 255, 255)');
  await expect(footer.locator('.title-menu').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(footer.locator('.list_footer a').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
  expect(errors).toEqual([]);
});

test('flash sale and featured carousel move, prices and CTA stay readable', async ({ page }) => {
  const errors = await openHome(page);
  for (const selector of ['.swiper_sale', '.swiper_featured']) {
    const carousel = page.locator(selector);
    await carousel.scrollIntoViewIfNeeded();
    await expect(carousel.locator('form').first()).toBeVisible();
    await expect.poll(() => carousel.evaluate(e => e.swiper?.activeIndex)).toBe(0);
    const sizing = await carousel.evaluate(e => ({ actual: e.querySelector('.swiper-slide').getBoundingClientRect().width, expected: (e.clientWidth - 3 * e.swiper.params.spaceBetween) / 4 }));
    expect(Math.abs(sizing.actual - sizing.expected)).toBeLessThan(1);
    await carousel.getByRole('button', { name: 'Sản phẩm tiếp theo', exact: true }).click();
    await expect.poll(() => carousel.evaluate(e => e.swiper.activeIndex)).toBeGreaterThan(0);
    await carousel.getByRole('button', { name: 'Sản phẩm trước', exact: true }).click();
    await expect.poll(() => carousel.evaluate(e => e.swiper.activeIndex)).toBe(0);
    await expect(carousel.locator('.pc-btn--action').first()).toHaveCSS('color', 'rgb(0, 63, 45)');
  }
  await expect(page.locator('.pc-flashsale')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.pc-flashsale__countdown-timer')).not.toContainText('NaN');
  expect(errors).toEqual([]);
});

test('one click adds one item through the existing cart API', async ({ page }) => {
  const errors = await openHome(page);
  await page.locator('.swiper_featured').scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator('.swiper_featured').evaluate(e => Boolean(e.swiper))).toBe(true);
  const add = page.locator('.swiper_featured .add_to_cart').first();
  await expect(add).toBeAttached();
  // Move Swiper to the purchasable single-variant card, then use the real button.
  await add.evaluate(e => {
    const slide = e.closest('.swiper-slide');
    const swiper = document.querySelector('.swiper_featured').swiper;
    swiper.slideTo(Array.from(slide.parentElement.children).indexOf(slide), 0);
  });
  let requests = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/cart/add.js' && request.method() === 'POST') requests++; });
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/cart/add.js' && r.request().method() === 'POST');
  await add.click();
  expect((await response).ok()).toBeTruthy();
  await expect.poll(async () => (await (await page.request.get('/cart.js')).json()).item_count).toBe(1);
  expect(requests).toBe(1);
  expect(errors).toEqual([]);
});

test('multiple variants navigate to the product instead of submitting a guessed variant', async ({ page }) => {
  await openHome(page);
  await page.locator('.swiper_sale').scrollIntoViewIfNeeded();
  const detail = page.locator('.swiper_sale').getByRole('button', { name: 'Xem chi tiết', exact: true }).first();
  await expect(detail).toBeVisible();
  const url = await detail.locator('xpath=ancestor::form').locator('.product-name a').getAttribute('href');
  let adds = 0;
  page.on('request', r => { if (r.url().includes('/cart/add')) adds++; });
  await detail.click();
  await expect(page).toHaveURL(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
  expect(adds).toBe(0);
  await expect(page.locator('body')).not.toHaveClass(/pc-home-v3/);
});

for (const width of [360, 390, 768]) {
  test(`responsive layout and mobile navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors = await openHome(page);
    for (const section of ['.hero', '.concerns', '.swiper_sale', '.dark-zone', '.post-lead', '.footer']) {
      await page.locator(section).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.locator('#mb-search-open').click();
    await expect(page.locator('#mb-search-popup')).toBeVisible();
    await page.locator('#mb-search-input').fill('Retinol');
    await page.locator('#mb-search-input').press('Enter');
    await expect(page).toHaveURL(/\/search\?query=Retinol&type=product/);
    expect(errors).toEqual([]);
  });
}

test('missing and failed images use the local fallback, including dynamic app content', async ({ page }) => {
  await openHome(page);
  await page.evaluate(() => {
    const img = document.createElement('img');
    img.id = 'failed-product-image';
    img.srcset = '/missing-product-image.jpg 1x';
    img.src = '/missing-product-image.jpg';
    document.querySelector('.ab-most-view-product-module').append(img);
  });
  const img = page.locator('#failed-product-image');
  await expect(img).toHaveAttribute('src', /no-image\.jpg/);
  await expect.poll(() => img.evaluate(e => e.complete && e.naturalWidth > 0)).toBeTruthy();
  expect(await img.getAttribute('srcset')).toBeNull();
});

test('section settings tolerate disabled, unknown and duplicate slots', async () => {
  const html = await engine.renderFile('home_portal', {
    settings: { home_section_1: 'section_portal_split', home_section_2: 'none', home_section_3: 'removed_section', home_section_4: 'section_portal_split', home_section_5: 'section_hero' },
    store: { name: 'Test Store' },
  });
  expect((html.match(/id="section_portal_split"/g) || []).length).toBe(1);
  expect(html).not.toContain('removed_section');
  expect(html.indexOf('id="section_portal_split"')).toBeLessThan(html.indexOf('id="section_hero"'));
});

test('empty blog, image mode fallback and newsletter configuration fail gracefully', async () => {
  const hero = await engine.renderFile('section_hero', {settings:{portal_hero_visual:'diagram'}});
  expect(hero).toContain('Sơ đồ phân tích lớp da');
  expect(hero).not.toContain('<img');
  const blog = await engine.renderFile('section_portal_blog', { settings: { portal_blog: 'missing' }, blogs: {} });
  expect(blog).toContain('Bài viết đang được cập nhật.');
  const newsletter = await engine.renderFile('section_portal_newsletter', {settings:{}});
  expect(newsletter.trim()).toBe('');
  const configured = await engine.renderFile('section_portal_newsletter', {settings:{portal_newsletter_action:'https://example.test/subscribe/post'}});
  expect(configured).toContain('action="https://example.test/subscribe/post"');
  expect(configured).toContain('name="EMAIL"');
  expect(configured).not.toContain('return false');
});

test('product cards keep sold-out, contact-price and preorder behavior', async () => {
  const base = { id:1, name:'Test product', url:'/test-product', variants:[{id:11,price:100,compare_at_price:150}], selected_or_first_available_variant:{id:11,price:100,compare_at_price:150}, images:[], tags:[] };
  const render = product => engine.renderFile('product_grid_office_sale', { product, settings: {}, template: 'index' });
  const soldout = await render({...base, available:false});
  expect(soldout).toContain('disabled class="pc-btn--action');
  expect(soldout).not.toContain('class="pc-btn--action add_to_cart');
  const contact = await render({...base, available:true, selected_or_first_available_variant:{price:0,compare_at_price:0}});
  expect(contact).toContain('Liên hệ');
  expect(contact).not.toContain('class="pc-btn--action add_to_cart');
  const preorder = await render({...base, available:true,tags:['Pre-order']});
  expect(preorder).toContain('Đặt hàng trước');
  expect(preorder).not.toContain('class="pc-btn--action add_to_cart');
  expect(preorder).not.toContain('class="lazyload duration-300 image2"');
});

test('late app carousel moves and other routes keep their layout', async ({ page }) => {
  await openHome(page);
  await page.locator('.ab-most-view-product-module').scrollIntoViewIfNeeded();
  const body = page.locator('.most-view-module-body');
  await expect.poll(() => body.evaluate(e => !!e.swiper)).toBeTruthy();
  // The preview app has four products: desktop shows all four, so Next is correctly disabled.
  await expect(page.locator('.most-view-btn-pager-next')).toBeDisabled();
  await page.setViewportSize({width:768,height:1000});
  await expect(page.locator('.most-view-btn-pager-next')).toBeEnabled();
  await page.locator('.most-view-btn-pager-next').click();
  await expect.poll(() => body.evaluate(e => e.swiper.activeIndex)).toBeGreaterThan(0);
  for (const url of ['/collections/all', '/dat-lich-tu-van', '/skin-health-beauty', '/mops-admin']) {
    const response = await page.goto(url, {waitUntil:'domcontentloaded'});
    expect(response.status()).toBe(200);
    await expect(page.locator('body')).not.toHaveClass(/pc-home-v3/);
    await expect(page.locator('link[href*="home-portal"]')).toHaveCount(0);
  }
});
