#!/usr/bin/env node
/**
 * audit-sapo-review.js (2026-10-03) — quét tự động một phần Checklist Sapo Review (Rule&HDKTXD.md)
 * trên bản preview (dev-server) hoặc production, bằng Playwright:
 *   - mỗi trang đúng 1 <h1>
 *   - <img> có alt, width, height; ảnh ngoài màn hình đầu có loading="lazy"
 *   - không lỗi JS (pageerror) / console.error
 *   - không tràn ngang ở viewport mobile 375px
 * Dùng: BASE=http://localhost:3000 node scripts/audit-sapo-review.js [--json]
 * Thoát mã 1 khi có trang vi phạm. Không thay thế PageSpeed / review thủ công.
 */
const { chromium } = require('playwright');

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '');
const ROUTES = [
  '/', '/collections/all', '/chong-lao-hoa', '/serum-vitamin-c-15', '/kem-duong-am-hyaluronic-acid',
  '/blogs/tin-tuc', '/blogs/tin-tuc/retinol-thanh-phan-vang-chong-lao-hoa', '/cart', '/search?query=serum',
  '/account/login', '/account/register', '/account',
  '/pages/about-us', '/pages/ai-skin-quiz', '/ai-skin-quiz-results', '/pages/chuyen-gia',
  '/pages/chuyen-gia-detail', '/pages/clinical-proof', '/pages/chinh-sach-bao-mat', '/pages/dai-ly-b2b',
  '/pages/dat-lich-tu-van', '/pages/loyalty', '/pages/order-lookup', '/pages/order-tracking',
  '/pages/patient-portal', '/pages/payment', '/pages/seo-directory', '/pages/skin-health-beauty',
  '/pages/skinhealthy-services', '/pages/getglowing-micro-peel-ha-noi', '/pages/spa-services',
  '/pages/tra-cuu-hoat-chat', '/trang-khong-ton-tai-404',
];

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const jsErrors = [];
    page.on('pageerror', (e) => jsErrors.push(e.message.slice(0, 160)));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      // Lỗi tải tài nguyên đã ghi chi tiết (kèm URL) ở requestfailed/response bên dưới.
      if (/Failed to load resource/.test(m.text())) return;
      jsErrors.push('console: ' + m.text().slice(0, 160));
    });
    page.on('response', (r) => {
      // Trang 404 chủ đích (route kiểm thử) tự trả 404 — không tính là lỗi tài nguyên.
      // bizweb-api.js/common.js/customer.js dùng filter bizweb_asset_url của Sapo — dev-server chưa giả
      // lập filter này nên ra đường dẫn tương đối 404; trên Sapo thật không lỗi.
      if (/\/(bizweb-api|common|customer)\.js(\?|$)/.test(r.url()) && !/\/assets\//.test(r.url())) return;
      if (r.status() >= 400 && r.url() !== BASE + route) jsErrors.push(`HTTP ${r.status()}: ${r.url().replace(BASE, '').slice(0, 140)}`);
    });
    let status = 0;
    try {
      const r = await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
      status = r ? r.status() : 0;
      await page.waitForTimeout(800);
    } catch (e) {
      jsErrors.push('goto: ' + e.message.slice(0, 120));
    }
    const info = await page.evaluate(() => {
      const vh = window.innerHeight;
      // Bỏ qua (có lý do): .most-view-module-body = app bên thứ 3 (appbulk "sản phẩm xem nhiều") tự chèn
      // bằng JS, không thuộc template; #sh-clinic-lb-img = ảnh lightbox, src do JS gán theo ảnh được bấm.
      const imgs = [...document.querySelectorAll('img')].filter((i) => !i.closest('noscript, template, .most-view-module-body') && i.id !== 'sh-clinic-lb-img');
      const bad = { noAlt: [], noSize: [], noLazy: [] };
      for (const i of imgs) {
        const src = (i.getAttribute('data-src') || i.getAttribute('src') || '').slice(0, 80);
        if (!i.hasAttribute('alt')) bad.noAlt.push(src);
        if (!i.hasAttribute('width') || !i.hasAttribute('height')) bad.noSize.push(src);
        const top = i.getBoundingClientRect().top + window.scrollY;
        const lazy = i.getAttribute('loading') === 'lazy' || i.classList.contains('lazyload') || i.hasAttribute('data-src');
        if (top > vh * 1.5 && !lazy) bad.noLazy.push(src);
      }
      return {
        h1: document.querySelectorAll('h1').length,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        imgs: imgs.length,
        bad,
      };
    }).catch((e) => ({ error: e.message }));
    await page.close();
    const issues = [];
    if (info.error) issues.push('evaluate: ' + info.error);
    else {
      if (info.h1 !== 1) issues.push(`h1=${info.h1}`);
      if (info.overflowX > 2) issues.push(`tràn ngang ${info.overflowX}px @375`);
      if (info.bad.noAlt.length) issues.push(`img thiếu alt: ${info.bad.noAlt.length}`);
      if (info.bad.noSize.length) issues.push(`img thiếu width/height: ${info.bad.noSize.length}`);
      if (info.bad.noLazy.length) issues.push(`img dưới màn hình không lazy: ${info.bad.noLazy.length}`);
    }
    if (jsErrors.length) issues.push(`lỗi JS/console: ${jsErrors.length}`);
    results.push({ route, status, issues, jsErrors: [...new Set(jsErrors)].slice(0, 5), samples: info.bad });
  }
  await browser.close();

  if (process.argv.includes('--json')) { console.log(JSON.stringify(results, null, 1)); }
  else {
    for (const r of results) {
      console.log(`${r.issues.length ? '✗' : '✓'} ${r.status} ${r.route}${r.issues.length ? '  — ' + r.issues.join(' | ') : ''}`);
      r.jsErrors.forEach((e) => console.log('      ' + e));
    }
  }
  const failed = results.filter((r) => r.issues.length).length;
  console.log(`\n[audit:sapo-review] ${results.length - failed}/${results.length} trang đạt.`);
  process.exit(failed ? 1 : 0);
})();
