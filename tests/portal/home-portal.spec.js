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
  await expect(page.locator('.hero h1')).toHaveCSS('font-family', /Montserrat/);
  await expect(page.locator('.pc-portal')).not.toContainText('GPKD 0109xxxxxx');
  expect(await page.locator('.pc-portal a[href="#"]').count()).toBe(0);
  const ids = await page.locator('.portal-section').evaluateAll(nodes => nodes.map(n => n.id));
  expect(ids).toEqual(Array.from({ length: 18 }, (_, i) => settings[`home_section_${i+1}`]).filter(s => s !== 'none'));
  // 2026-10-13: Hero bỏ nút 2 "Chọn theo vấn đề da" (mỗi slide chỉ còn 1 nút) — giữ kiểm tra khối giải pháp.
  await expect(page.locator('.concerns a')).toHaveCount(6);
  // 2026-10-16: "Tìm theo hoạt chất" dùng chung carousel .pc-brands với Thương hiệu — đếm slide thật (bỏ bản lặp loop của Swiper).
  // Dữ liệu demo có menu mua-sam-theo-thanh-phan (16 hoạt chất, ảnh danh mục thật) ⇒ mục nào cũng có ảnh + tên dưới ảnh.
  const ingSlides = page.locator('.pc-brands--ing .pc-brand:not(.swiper-slide-duplicate)');
  await expect(ingSlides).toHaveCount(16);
  await expect(ingSlides.locator('.pc-brand__logo img')).toHaveCount(16);
  await expect(ingSlides.locator('.pc-brand__title')).toHaveCount(16);
  await expect(page.locator('.pc-brands--ing')).toHaveAttribute('data-ready', '1');
  await expect(page.locator('.pc-brands--ing .pc-brands__nav')).toHaveCount(2);
  await expect(page.locator('.post-lead')).toHaveAttribute('href', /\S+/);
  expect(errors).toEqual([]);
});

test('hero swiper: mỗi slide ảnh + text + nút, 1 ảnh chung mọi màn hình, fade + Ken Burns', async ({ page }) => {
  // 2026-10-13 (snippets/section_hero.bwt): slide = Ảnh · Text · Text nút · Link; không loop (tránh trùng h1).
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors = await openHome(page);
  const hero = page.locator('[data-portal-hero]');
  expect(await hero.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(420);
  await expect(hero.locator('h1')).toHaveCount(1);
  await expect(hero.locator('h1')).toHaveCSS('color', 'rgba(255, 255, 255, 0.82)'); // text "chìm" theo ảnh mẫu
  await expect(hero.locator('h1')).toHaveText(settings.home_hero_title);
  const cta = hero.locator('.swiper-slide-active .portal-hero__btn');
  await expect(cta).toHaveAttribute('href', settings.home_hero_btn1_url);
  await expect(cta).toContainText(settings.home_hero_btn1_text);

  const slides = hero.locator('.portal-hero__slide');
  await expect(slides).toHaveCount(3);
  // Slide không nhập text/link nút vẫn có link — mặc định về trang đặt lịch.
  await expect(slides.locator('.portal-hero__btn')).toHaveCount(3);
  await expect(slides.nth(1).locator('.portal-hero__btn')).toHaveAttribute('href', '/dat-lich-tu-van');
  await expect(hero.locator('.swiper-slide-duplicate')).toHaveCount(0);
  await expect(hero.locator('picture, source')).toHaveCount(0);
  const heroImages = slides.locator('img');
  await expect(heroImages.nth(0)).toHaveAttribute('loading', 'eager');
  await expect(heroImages.nth(0)).toHaveAttribute('fetchpriority', 'high');
  await expect(heroImages.nth(1)).toHaveAttribute('loading', 'lazy');
  expect(await heroImages.evaluateAll(images => images.every(img => img.alt && img.getAttribute('width') === '1920' && img.getAttribute('height') === '1080'))).toBeTruthy();
  const lcpSource = await heroImages.nth(0).getAttribute('data-hero-source');
  await expect(page.locator('link[rel="preload"][as="image"][fetchpriority="high"]')).toHaveAttribute('href', lcpSource);
  // a407e08: zoom + lia chạy hết mỗi slide (pc-hero-kb-in, slide chẵn kb-out).
  await expect(hero.locator('.swiper-slide-active .portal-hero__image')).toHaveCSS('animation-name', /pc-hero-kb-(in|out)/);

  const slider = hero.locator('.portal-hero__media');
  const motion = await slider.evaluate(el => ({ effect: el.swiper.params.effect, speed: el.swiper.params.speed, delay: el.swiper.params.autoplay.delay, loop: el.swiper.params.loop }));
  expect(motion).toEqual({ effect: 'fade', speed: 1000, delay: Math.max(4000, Number(settings.home_hero_delay) || 5000), loop: false });
  // 2026-10-16 (người dùng): bỏ chấm phân trang + mũi tên; nút không nền, chữ xanh có vệt sáng quét.
  await expect(hero.locator('[data-hero-prev], [data-hero-next], .portal-hero__dots')).toHaveCount(0);
  const btn = hero.locator('.swiper-slide-active .portal-hero__btn');
  await expect(btn).toHaveCSS('animation-name', 'pc-hero-btn-shine');
  await expect(btn).toHaveCSS('box-shadow', 'none');
  expect(await btn.evaluate(el => getComputedStyle(el).backgroundClip || getComputedStyle(el).webkitBackgroundClip)).toBe('text');
  // a407e08: rê chuột không dừng (Hero 100vh ⇒ chuột luôn nằm trên); chỉ dừng khi focus bàn phím.
  await hero.hover();
  await expect.poll(() => slider.evaluate(el => el.swiper.autoplay.running)).toBe(true);
  await hero.locator('.swiper-slide-active .portal-hero__btn').focus();
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
  await expect(hero.locator('[data-hero-pause]')).toHaveCount(0); // 2026-10-13: đã bỏ nút pause Hero
  await expect(hero.locator('.swiper-slide-active .portal-hero__image')).toHaveCSS('animation-name', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('topbar keeps accessible contrast, vector icons and a readable vertical ticker', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors = await openHome(page);
  const topbar = page.locator('.pc-topbar');
  // edd746c (2026-10-13): trang chủ có Hero đầu ⇒ header/topbar trong suốt đè lên ảnh; rê chuột vào header ⇒ về nền gốc.
  await expect(topbar).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.locator('header.header').hover();
  await expect(topbar).toHaveCSS('background-color', 'rgb(60, 179, 113)');
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
  await expect(page.locator('[data-topbar-pause]')).toHaveCount(0); // 2026-10-13: đã bỏ nút pause topbar
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(page.locator('.pc-topbar__phone')).toBeHidden();
  await expect(page.locator('.topbar-account')).toBeHidden();
  await expect(page.locator('.lang-switcher')).toBeVisible();
  expect(errors).toEqual([]);
});

test('desktop header is compact, token-consistent and opaque while sticky', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors = await openHome(page);
  const header = page.locator('header.header');
  const mainRow = header.locator('.pc-header-row');
  expect(await mainRow.evaluate(el => el.getBoundingClientRect().height)).toBe(68);

  // edd746c (2026-10-13): ở đầu trang chủ header trong suốt, icon trắng; hover ⇒ về màu token gốc.
  await expect(header.locator('.header-action-search')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await header.hover();
  const interactiveColors = await header.evaluate(el => [
    el.querySelector('.pc-logo-master'),
    el.querySelector('.header-action-search'),
    el.querySelector('.sudes-header-cart > a'),
    el.querySelector('.sudes-header-iwish > a'),
  ].filter(Boolean).map(node => getComputedStyle(node).color));
  expect(new Set(interactiveColors)).toEqual(new Set(['rgb(0, 63, 45)']));

  await page.evaluate(() => window.scrollTo(0, 900));
  await expect(header).toHaveClass(/hSticky/);
  const stickyMenu = header.locator('.header-menu');
  await expect(stickyMenu).toHaveCSS('position', 'fixed');
  await expect(stickyMenu).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(stickyMenu).toHaveCSS('isolation', 'isolate');
  expect(Number(await stickyMenu.evaluate(el => getComputedStyle(el).zIndex))).toBeGreaterThan(10000);
  expect(await stickyMenu.evaluate(el => el.getBoundingClientRect().height)).toBeLessThanOrEqual(48);
  expect(errors).toEqual([]);
});

test('footer uses the master logo and white content on the mainColor brand background', async ({ page }) => {
  const errors = await openHome(page);
  const footer = page.locator('footer.footer');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toHaveCSS('background-color', 'rgb(60, 179, 113)');
  await expect(footer).toHaveCSS('color', 'rgb(255, 255, 255)');
  // 2026-10-07: footer mặc định dùng ảnh "Logo chân trang" (logo_footer.png, Logo Master trắng); tắt ảnh thì về SVG.
  await expect(footer.locator('.pc-footer-logo .pc-logo-master-img, .pc-footer-logo .pc-logo-master-svg')).toHaveCount(1);
  await expect(footer.locator('.logo-icon, .logo-text-block')).toHaveCount(0);
  await expect(footer.locator('.pc-footer-logo')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(footer.locator('.title-menu').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
  // 2026-10-13: khối liên hệ footer đổi markup sang .pc-foot__contact (snippets/footer.bwt).
  await expect(footer.locator('.pc-foot__contact a').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
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
    // 2026-10-13: nút trước/sau của Sản phẩm bán chạy nằm 2 bên sườn (.pc-featured__stage), ngoài .swiper_featured.
    const controls = selector === '.swiper_featured' ? page.locator('.pc-featured__stage') : carousel;
    await controls.getByRole('button', { name: 'Sản phẩm tiếp theo', exact: true }).click();
    await expect.poll(() => carousel.evaluate(e => e.swiper.activeIndex)).toBeGreaterThan(0);
    await controls.getByRole('button', { name: 'Sản phẩm trước', exact: true }).click();
    await expect.poll(() => carousel.evaluate(e => e.swiper.activeIndex)).toBe(0);
    // 2026-10-16: Flash Sale chuyển tông đỏ theo thiết kế (nút viền chữ đỏ, nút Thêm vào giỏ đỏ chữ trắng); Bán chạy giữ xanh.
    if (selector === '.swiper_sale') {
      await expect(carousel.locator('.pc-btn--action:not(.add_to_cart)').first()).toHaveCSS('color', 'rgb(225, 29, 42)');
      await expect(carousel.locator('.pc-btn--action.add_to_cart').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
    } else {
      await expect(carousel.locator('.pc-btn--action').first()).toHaveCSS('color', 'rgb(0, 63, 45)');
    }
  }
  await expect(page.locator('.pc-flashsale')).toHaveCSS('background-image', /linear-gradient/);
  await expect(page.locator('.pc-flashsale__countdown-timer .block-timer b').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.locator('.pc-flashsale__title .pc-flashsale__bolt img')).toHaveCSS('animation-name', 'pc-pulsescale');
  await expect(page.locator('.pc-flashsale__countdown-timer')).not.toContainText('NaN');

  const featured = page.locator('.pc-featured-products');
  const navGeometry = await featured.evaluate(section => {
    const prev = section.querySelector('.pc-featured__prev').getBoundingClientRect();
    const next = section.querySelector('.pc-featured__next').getBoundingClientRect();
    // Chỉ xét ảnh của slide đang nằm trong khung swiper (slide khuất bị overflow cắt, không nhìn thấy).
    const frame = section.querySelector('.swiper_featured').getBoundingClientRect();
    const thumbnails = [...section.querySelectorAll('.product-thumbnail')].map(el => el.getBoundingClientRect())
      .filter(r => r.right > frame.left + 1 && r.left < frame.right - 1);
    const overlaps = (button, image) => !(button.right <= image.left || button.left >= image.right || button.bottom <= image.top || button.top >= image.bottom);
    return {
      axisOffset: Math.abs((prev.top + prev.height / 2) - (next.top + next.height / 2)),
      targetSizes: [prev.width, prev.height, next.width, next.height],
      overlapsProduct: thumbnails.some(image => overlaps(prev, image) || overlaps(next, image)),
    };
  });
  expect(navGeometry.axisOffset).toBeLessThan(1);
  expect(navGeometry.targetSizes).toEqual([44, 44, 44, 44]);
  expect(navGeometry.overlapsProduct).toBe(false);
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
  // 2026-10-03: ảnh dự phòng lấy từ snippet placeholder_img_url (settings.placeholder_image hoặc
  // khung SVG inline) thay cho assets/no-image.jpg — build:sapo cấm ảnh bitmap nội dung trong assets/.
  await expect(img).toHaveAttribute('src', /^data:image\/svg\+xml,/);
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
  // 2026-10-13: Hero chưa có ảnh ⇒ không dựng swiper, vẫn giữ 1 h1 ẩn cho SEO.
  const hero = await engine.renderFile('section_hero', {settings:{home_hero_title:'Tiêu đề thử'}});
  expect(hero).not.toContain('<img');
  expect(hero).toContain('<h1 class="portal-hero__sr">Tiêu đề thử</h1>');
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
