#!/usr/bin/env node
/*
  scripts/ui-verify.mjs — bộ kiểm UX/UI trên TRÌNH DUYỆT THẬT (Playwright) theo docs/UI-STANDARD.md (G.4, B.7).
  KHOÁ NGƯỠNG (R5): không nới/tắt ngưỡng để qua kiểm; muốn đổi phải qua đề xuất C.6.

  Chạy trên preview local (npm run preview, mặc định http://localhost:3000; đổi bằng UI_BASE=...).
    node scripts/ui-verify.mjs --quick / /collections/all      # trang chỉ định: 390 Chromium + 390 WebKit + 1440
    node scripts/ui-verify.mjs --full                          # 70 trang × 390/1440 + 24 trang × 320/768/1024/ngang + luồng + link + tốc độ
    node scripts/ui-verify.mjs --flows | --perf | --links      # từng phần riêng
    node scripts/ui-verify.mjs --full --write-baseline         # ghi ui-loop/baseline.json (chỉ khi việc vừa DONE)
  Kết quả: ui-loop/reports/<thời gian>.json (+ ảnh ở ui-loop/reports/shots/<thời gian>/), bảng so baseline.
  Exit: --quick ⇒ 1 khi có lỗi MỚI so với baseline; --full ⇒ 1 khi chưa "sạch" (G.4). 2 = lỗi môi trường.
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium, webkit, devices } = require('playwright');
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.UI_BASE || 'http://localhost:3000').replace(/\/$/, '');
const OUT = path.join(ROOT, 'ui-loop', 'reports');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const SHOTS = path.join(OUT, 'shots', STAMP);
const BASELINE = path.join(ROOT, 'ui-loop', 'baseline.json');
// Git Bash (MSYS) đổi đối số "/collections/all" thành "C:/Program Files/Git/collections/all" — đổi ngược lại
const args = process.argv.slice(2).map((a) => a.replace(/^[A-Za-z]:[\\/](?:Program Files[\\/])?Git(?=[\\/])/i, '').replace(/\\/g, '/'));
const has = (f) => args.includes(f);

// ── Ngưỡng B.7 (KHOÁ) ─────────────────────────────────────────────────────────────
const T = { touchMin: 24, touchRec: 44, textMin: 12, inputFont: 16, inputH: 44, fixedMaxPct: 15,
  fcp: 1800, lcp: 2500, tbt: 200, cls: 0.1, pageKB: 1500, homeKB: 2500 };

// ── Danh sách trang (E.2) ────────────────────────────────────────────────────────
const PAGES = [
  '/', '/collections/all', '/collections/skinceuticals', '/collections/giai-phap-mun-trung-ca', '/collections/flash-sale-1',
  '/?tpl=collection.lieu-trinh', '/?tpl=collection.skinhealthy', '/?tpl=list_collections', '/products/serum-vitamin-c-15',
  '/products/kem-duong-retinol-0-3-peptide', '/?tpl=product.lieu-trinh', '/?tpl=search', '/?tpl=cart', '/payment', '/order',
  '/order-lookup', '/order-tracking', '/?tpl=login', '/?tpl=register', '/?tpl=reset_password', '/?tpl=account', '/?tpl=orders',
  '/?tpl=addresses', '/?tpl=change_password', '/loyalty', '/patient-portal', '/dat-lich-tu-van', '/chuyen-gia', '/chuyen-gia-detail',
  '/skin-health-beauty', '/skin-health-beauty-chi-tiet', '/skin-health-beauty-thanh-toan', '/skinhealthy-services',
  '/skinhealthy-service-detail', '/spa-services', '/dich-vu-skin-healthy-beauty', '/getglowing-micro-peel-ha-noi',
  '/dang-ky-lieu-trinh-tri-mun', '/truoc-sau-cham-soc-da-tu-xa', '/soi-da', '/kham-da-ai', '/ai-skin-quiz', '/ai-skin-quiz-results',
  '/tra-cuu-hoat-chat', '/tin-tuc', '/blogs/tin-tuc-va-kien-thuc', '/blogs/tin-tuc-va-kien-thuc/retinol-thanh-phan-vang-chong-lao-hoa',
  '/blogs/bi-quyet', '/blogs/video', '/blogs/video/huong-dan-su-dung-toner-dung-cach', '/blogs/truoc-va-sau',
  '/blogs/truoc-va-sau/giam-tham-sau-mun-5-tuan', '/blogs/chuyen-gia', '/blogs/chuyen-gia/chuyen-gia-thanh-hang', '/blogs/hoat-chat',
  '/blogs/hoat-chat/retinol', '/blogs/van-de-da', '/blogs/van-de-da/tham-sau-mun', '/blogs/giai-phap-skin-health',
  '/?tpl=blog.instagram-feed', '/about-us', '/gioi-thieu', '/clinical-proof', '/dai-ly-b2b', '/chinh-sach-bao-mat', '/seo-directory',
  '/?tpl=page', '/?tpl=404',
];
const RESP_PAGES = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/?tpl=search', '/?tpl=login', '/?tpl=register',
  '/?tpl=account', '/dat-lich-tu-van', '/skinhealthy-services', '/skinhealthy-service-detail', '/?tpl=product.lieu-trinh',
  '/getglowing-micro-peel-ha-noi', '/soi-da', '/ai-skin-quiz', '/tra-cuu-hoat-chat', '/tin-tuc',
  '/blogs/tin-tuc-va-kien-thuc/retinol-thanh-phan-vang-chong-lao-hoa', '/blogs/truoc-va-sau', '/clinical-proof', '/about-us',
  '/chuyen-gia', '/order-lookup', '/dai-ly-b2b'];
const PERF_PAGES = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/soi-da', '/tin-tuc',
  '/blogs/tin-tuc-va-kien-thuc/retinol-thanh-phan-vang-chong-lao-hoa', '/skinhealthy-services', '/dat-lich-tu-van', '/?tpl=login'];
const QUICK_DEFAULT = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/dat-lich-tu-van', '/?tpl=login'];
// Route hệ thống của Sapo không có trên preview — không tính link hỏng.
const SAPO_SYSTEM = /^\/(checkout|account\/logout|account\/changepassword|cart\/(add|change|clear|update)|services\/|admin)/;

const VP = {
  'm390': { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'd1440': { viewport: { width: 1440, height: 900 } },
  'm320': { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true },
  't768': { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
  'd1024': { viewport: { width: 1024, height: 768 } },
  'land': { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
};

// ── Đo trong trang ───────────────────────────────────────────────────────────────
function measure(T) {
  const vis = (el) => { for (let p = el; p && p !== document.documentElement; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; } const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const lab = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).trim().split(/\s+/)[0];
  const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.value || (el.querySelector('img[alt]') || {}).alt || '').trim().replace(/\s+/g, ' ');
  const mobile = innerWidth < 1024;
  const r = { issues: {}, samples: {} };
  const add = (k, s) => { r.issues[k] = (r.issues[k] || 0) + 1; if (s) { (r.samples[k] = r.samples[k] || []); if (r.samples[k].length < 6 && !r.samples[k].includes(s)) r.samples[k].push(s); } };
  if (document.documentElement.scrollWidth - innerWidth > 1) add('overflowX', (document.documentElement.scrollWidth - innerWidth) + 'px');
  const h1 = [...document.querySelectorAll('h1')].filter((h) => { for (let e = h; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).display === 'none') return false; return h.textContent.trim().length > 0; }).length;
  if (h1 !== 1) add('h1Count', String(h1));
  if (document.querySelectorAll('main').length !== 1) add('mainLandmark', String(document.querySelectorAll('main').length));
  if (!document.querySelector('a[href="#main"], a[href="#main-content"], .pc-skip-link')) add('skipLink');
  if (/tagged ""|^\s*$/.test(document.title)) add('badTitle', document.title.slice(0, 60));
  if (document.documentElement.innerHTML.includes('PC-ERROR')) add('pcError', (document.documentElement.innerHTML.match(/PC-ERROR[^>]{0,80}/) || [''])[0]);
  const bodyText = document.body.innerText;
  if (/Liquid (syntax )?error|SYSTEM\.LINQ|\{\{|\{%/.test(bodyText)) add('liquidLeak');
  if (/Nội dung trang demo|lorem ipsum/i.test(bodyText)) add('demoText');
  // vùng chạm
  document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], summary').forEach((el) => {
    if (!vis(el)) return; const s = getComputedStyle(el);
    if (el.tagName === 'A' && s.display === 'inline' && el.closest('p, td, .rte')) return; // link trong đoạn văn: WCAG miễn
    const b = el.getBoundingClientRect(); const w = Math.round(b.width), h = Math.round(b.height);
    if (w < T.touchMin || h < T.touchMin) add('touch<24', lab(el) + '«' + name(el).slice(0, 16) + '» ' + w + 'x' + h);
    else if (mobile && (w < T.touchRec || h < T.touchRec) && !el.closest('nav.breadcrumb, .breadcrumb')) add('touch<44', lab(el) + '«' + name(el).slice(0, 16) + '» ' + w + 'x' + h);
  });
  // tên truy cập
  document.querySelectorAll('a[href], button, [role=button]').forEach((el) => { if (vis(el) && !name(el) && !el.getAttribute('aria-labelledby')) add('noName', lab(el)); });
  // ô nhập
  document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), select, textarea').forEach((f) => {
    if (!vis(f)) return; const id = lab(f) + '[' + (f.name || f.id || f.type) + ']';
    const labelled = (f.id && document.querySelector('label[for="' + CSS.escape(f.id) + '"]')) || f.closest('label') || f.getAttribute('aria-label') || f.getAttribute('aria-labelledby');
    if (!labelled) add('inputNoLabel', id);
    if (mobile) { if (parseFloat(getComputedStyle(f).fontSize) < T.inputFont) add('input<16px', id + ' ' + getComputedStyle(f).fontSize); if (f.getBoundingClientRect().height < T.inputH - 0.5) add('input<44h', id + ' h=' + Math.round(f.getBoundingClientRect().height)); }
  });
  // chữ < 12px (mobile)
  if (mobile) { const seen = new Set(); const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) { const t = tw.currentNode; const txt = t.textContent.trim(); const el = t.parentElement; if (txt.length < 2 || !el || seen.has(el)) continue; seen.add(el);
      if (el.closest('script,style,noscript,.sr-only,.visually-hidden,svg,[aria-hidden=true],#dev-toolbar,.dev-toolbar,.tpl-badge')) continue; if (!vis(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < T.textMin) add('text<12', lab(el) + '«' + txt.slice(0, 16) + '» ' + fs + 'px'); } }
  // ảnh
  document.querySelectorAll('img').forEach((i) => { if (!vis(i)) return; if (i.complete && i.naturalWidth === 0 && i.getAttribute('src')) add('imgBroken', (i.getAttribute('src') || '').slice(-60)); if (!i.hasAttribute('alt')) add('imgNoAlt', (i.getAttribute('src') || '').slice(-60)); });
  // carousel tự chạy khi giảm chuyển động (context mở với reducedMotion:'reduce')
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('.swiper, .swiper-container').forEach((s) => { if (s.swiper && s.swiper.autoplay && s.swiper.autoplay.running) add('autoplayReduced', lab(s)); });
  return r;
}
function fixedArea() {
  let area = 0; const vh = innerHeight, vw = innerWidth; const list = [];
  document.querySelectorAll('body *').forEach((el) => { const s = getComputedStyle(el); if ((s.position === 'fixed' || s.position === 'sticky') && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0) {
    const b = el.getBoundingClientRect(); if (b.width < 8 || b.height < 8 || b.bottom <= 0 || b.top >= vh) return;
    for (let p = el.parentElement; p; p = p.parentElement) { const ps = getComputedStyle(p); if (ps.position === 'fixed' || ps.position === 'sticky') return; }
    const a = Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0)) * Math.max(0, Math.min(b.right, vw) - Math.max(b.left, 0)); area += a;
    list.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' ' + Math.round(a / (vw * vh) * 100) + '%'); } });
  return { pct: Math.round(area / (vw * vh) * 100), list };
}

async function settle(page) {
  await page.evaluate(async () => { for (let y = 0, i = 0; y < document.body.scrollHeight && i < 40; y += 700, i++) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
  await page.waitForTimeout(400);
}

async function checkPage(browser, vpName, pathName, opts = {}) {
  const ctx = await browser.newContext({ ...(opts.device || VP[vpName]), reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push('JS: ' + e.message.slice(0, 120)));
  page.on('response', (res) => { const u = res.url(); if (u.startsWith(BASE) && res.status() >= 400 && !/favicon/.test(u)) errors.push(res.status() + ' ' + u.replace(BASE, '').slice(0, 90)); });
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  const res = { vp: vpName, path: pathName, issues: {}, samples: {} };
  try {
    const resp = await page.goto(BASE + pathName, { waitUntil: 'load', timeout: 60000 });
    if (!resp || resp.status() >= 400) { res.issues.httpError = 1; res.samples.httpError = [String(resp && resp.status())]; }
    await page.waitForTimeout(800); await settle(page);
    Object.assign(res, await page.evaluate(measure, T));
    res.issues = res.issues || {};
    await page.evaluate(() => scrollTo(0, Math.min(1500, document.body.scrollHeight / 2))); await page.waitForTimeout(400);
    const fa = await page.evaluate(fixedArea); res.fixedPct = fa.pct;
    if (fa.pct > T.fixedMaxPct) { res.issues['fixed>15%'] = 1; res.samples['fixed>15%'] = [fa.pct + '%: ' + fa.list.join(', ')]; }
    await page.evaluate(() => scrollTo(0, 0));
    if (!opts.noAxe) {
      await page.addScriptTag({ content: AXE_SRC });
      const ax = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] })).violations.map((v) => ({ id: v.id, n: v.nodes.length, s: v.nodes.slice(0, 3).map((x) => x.target.join(' ').slice(0, 80)) })));
      ax.forEach((v) => { res.issues['axe:' + v.id] = v.n; res.samples['axe:' + v.id] = v.s; });
    }
    if (opts.focus) { // desktop: Tab 40 lần, ghi phần tử nhận focus mà không có viền nhìn thấy
      let none = 0; const smp = [];
      for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); const f = await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const s = getComputedStyle(a); const ok = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (s.boxShadow !== 'none' && /\d/.test(s.boxShadow)); return ok ? '' : a.tagName.toLowerCase() + '.' + String(a.className).split(' ')[0] + '«' + (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 14) + '»'; }); if (f) { none++; if (smp.length < 6 && !smp.includes(f)) smp.push(f); } }
      if (none) { res.issues.focusNoRing = none; res.samples.focusNoRing = smp; }
    }
    if (errors.length) { res.issues.consoleOr4xx = errors.length; res.samples.consoleOr4xx = [...new Set(errors)].slice(0, 5); }
    if (opts.shot) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, vpName + '_' + (pathName.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home') + '.png'), fullPage: !!opts.fullPage }); }
  } catch (e) { res.issues.fatal = 1; res.samples.fatal = [e.message.slice(0, 160)]; }
  await ctx.close();
  return res;
}

// ── Luồng thao tác (G.7) ─────────────────────────────────────────────────────────
async function flows(cr, wk) {
  const out = []; const ok = (id, pass, detail) => out.push({ flow: id, pass: !!pass, detail });
  const mob = () => cr.newContext({ ...VP.m390, reducedMotion: 'reduce' });
  // L01: menu ☰ có cây danh mục; Escape đóng + trả focus
  { const ctx = await mob(); const p = await ctx.newPage(); try { await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(800);
    const btn = p.locator('#btn-menu-mobile, [data-pc-menu-open], button[aria-label="Menu"]').first(); await btn.click(); await p.waitForTimeout(600);
    // Chủ dự án duyệt 24/10/2026: menu Sapo thật (data/sapo-menus.json) dùng URL gốc "/<handle>", không "/collections/"
    // ⇒ mở nhóm đầu của cây danh mục trong drawer rồi đếm link con thật nhìn thấy (bỏ "/" và javascript:). Ngưỡng ≥ 5 giữ nguyên.
    const grp = p.locator('#header-category-menu a[href^="javascript"]:visible, #header-category-menu [aria-expanded]:visible').first();
    if (await grp.count()) { await grp.click(); await p.waitForTimeout(600); }
    const cats = await p.evaluate(() => { const tree = document.querySelector('#header-category-menu') || document.querySelector('.header-menu'); if (!tree) return 0; return [...tree.querySelectorAll('a[href]')].filter((a) => { const h = a.getAttribute('href') || ''; if (!/^\/[^/]/.test(h)) return false; const b = a.getBoundingClientRect(); if (!b.height || b.top >= innerHeight) return false; for (let e = a; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return false; } return true; }).length; });
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    const back = await p.evaluate(() => { const a = document.activeElement; return a && (a.id === 'btn-menu-mobile' || a.hasAttribute('data-pc-menu-open') || a.getAttribute('aria-label') === 'Menu'); });
    const bottomCat = await p.evaluate(() => [...document.querySelectorAll('.pc-bottomnav a, .pc-bottom-nav a')].some((a) => /danh mục/i.test(a.textContent)));
    ok('L01-menu-danh-muc', cats >= 5, cats + ' link danh mục nhìn thấy trong cây menu sau khi mở nhóm đầu'); ok('L01-escape-tra-focus', back, 'focus sau Escape về nút ☰: ' + back); ok('L01-thanh-day-danh-muc', bottomCat, 'thanh đáy có mục Danh mục: ' + bottomCat);
  } catch (e) { ok('L01', false, 'lỗi: ' + e.message.slice(0, 100)); } await ctx.close(); }
  // L04: 6 form gửi trống — không bóng trình duyệt, lỗi tiếng Việt dưới ô, focus ô sai đầu
  for (const [name, url, sel] of [['login', '/account/login', 'form:has(input[type=password])'], ['register', '/account/register', 'form:has(input[type=password])'], ['booking', '/dat-lich-tu-van', 'form:has(#mops-customer-name), form:has([name*="name"])'], ['b2b', '/dai-ly-b2b', 'form:has([name=company_name])'], ['contact', '/about-us', 'form:has([name*="contact"])'], ['order-lookup', '/order-lookup', 'form:has(.pl-submit)']]) {
    const ctx = await mob(); const p = await ctx.newPage(); try { await p.goto(BASE + url, { waitUntil: 'load' }); await p.waitForTimeout(800);
      // Form đặt lịch MOPS không bọc <form> ⇒ phạm vi = form nếu có, không thì cả trang
      let form = p.locator(sel).first(); if (!(await form.count())) form = p.locator('body');
      const sub = form.locator('button[type=submit]:visible, input[type=submit]:visible, .mops-btn-submit:visible, .pl-submit:visible, button:not([type]):visible').first();
      if (!(await sub.count())) { ok('L04-' + name, false, 'không thấy nút gửi'); await ctx.close(); continue; }
      await sub.scrollIntoViewIfNeeded(); await sub.click(); await p.waitForTimeout(800);
      const st = await form.evaluate((f) => { const native = [...f.querySelectorAll('input,select,textarea')].some((i) => i.form && !i.form.noValidate && i.validationMessage && i.getBoundingClientRect().height > 0); /* bóng lỗi trình duyệt chỉ hiện khi ô nằm trong <form> không novalidate */ const errs = [...f.querySelectorAll('.pc-error, [role=alert], [id$="-error"]')].filter((e) => e.getBoundingClientRect().height > 0 && e.textContent.trim()); const vi = errs.filter((e) => /[ạảãáàâầấậẩẫăắằặẳẵêềếệểễôồốộổỗơờớợởỡưừứựửữđ]/i.test(e.textContent)); const a = document.activeElement; return { native, errs: errs.length, vi: vi.length, focusInvalid: !!(a && a.getAttribute('aria-invalid') === 'true'), en: errs.some((e) => /please|required|invalid/i.test(e.textContent)) }; });
      ok('L04-' + name, !st.native && st.vi >= 1 && !st.en && st.focusInvalid, JSON.stringify(st));
    } catch (e) { ok('L04-' + name, false, 'lỗi: ' + e.message.slice(0, 100)); } await ctx.close(); }
  // L05: WebKit iPhone — chạm ô nhập không phóng to
  { const ctx = await wk.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const bad = [];
    for (const url of ['/account/login', '/account/register', '/dat-lich-tu-van', '/order-lookup', '/dai-ly-b2b', '/?tpl=search']) { try { await p.goto(BASE + url, { waitUntil: 'load' }); await p.waitForTimeout(600);
      const inputs = p.locator('input[type=text]:visible, input[type=email]:visible, input[type=tel]:visible, input[type=password]:visible, input[type=search]:visible, textarea:visible'); const n = Math.min(await inputs.count(), 4);
      // Playwright WebKit không giả lập iOS tự phóng to ⇒ đo nguyên nhân (cỡ chữ ô < 16px, ô thấp < 44px) + scale
      for (let i = 0; i < n; i++) { await inputs.nth(i).tap().catch(() => {}); await p.waitForTimeout(300); const m = await p.evaluate(() => { const a = document.activeElement; const s = a ? getComputedStyle(a) : null; return { sc: window.visualViewport ? window.visualViewport.scale : 1, fs: s ? parseFloat(s.fontSize) : 99, h: a ? a.getBoundingClientRect().height : 99, n: a ? (a.name || a.id) : '' }; }); if (m.sc > 1.01 || m.fs < 16 || m.h < 43.5) bad.push(url + ' [' + m.n + '] chữ ' + m.fs + 'px cao ' + Math.round(m.h) + 'px scale ' + m.sc.toFixed(2)); await p.evaluate(() => { document.activeElement && document.activeElement.blur(); }); }
    } catch (e) { bad.push(url + ' lỗi ' + e.message.slice(0, 60)); } }
    ok('L05-webkit-khong-phong-to', bad.length === 0, bad.join('; ') || 'scale = 1 ở mọi ô'); await ctx.close(); }
  // L07: PDP — giá + nút chính trong 844px đầu, hoặc thanh mua hiện khi cuộn
  { const ctx = await mob(); const p = await ctx.newPage(); try { await p.goto(BASE + '/products/serum-vitamin-c-15', { waitUntil: 'load' }); await p.waitForTimeout(800);
    const top = await p.evaluate(() => { const f = (s) => { const e = [...document.querySelectorAll(s)].find((x) => x.getBoundingClientRect().height > 0); return e ? e.getBoundingClientRect().bottom : 9999; }; return { price: f('.pc-actionbar__price, .product-price, .price-box .price, .special-price'), btn: f('.pc-actionbar .pc-btn, button.btn_base.normal_button, button.add_to_cart') }; });
    await p.evaluate(() => scrollTo(0, 1700)); await p.waitForTimeout(500);
    const bar = await p.evaluate(() => { const b = document.querySelector('.pc-actionbar'); if (!b) return false; const r = b.getBoundingClientRect(); return r.height > 0 && r.top < innerHeight && r.bottom > 0; });
    ok('L07-pdp-mua-nhanh', (top.price <= 844 && top.btn <= 844) || bar, 'giá đáy=' + Math.round(top.price) + ' nút đáy=' + Math.round(top.btn) + ' thanh mua khi cuộn=' + bar);
    const ret = await p.evaluate(() => { const a = [...document.querySelectorAll('a')].find((x) => /đổi trả|đổi\/ trả|hoàn tiền/i.test(x.textContent) && x.getBoundingClientRect().height > 0); return a ? a.getAttribute('href') : null; });
    let st = 0; if (ret) { const r = await p.request.get(new URL(ret, BASE).href); st = r.status(); }
    ok('L07-link-doi-tra', ret && st === 200, 'href=' + ret + ' HTTP ' + st);
  } catch (e) { ok('L07', false, 'lỗi: ' + e.message.slice(0, 100)); } await ctx.close(); }
  // L09: Flash Sale — giá đổi mỗi ngày (chủ dự án 24/10) ⇒ sau mốc, đồng hồ sang chu kỳ kế tiếp, không "Hết hạn"/đứng 0
  { const ctx = await mob(); const p = await ctx.newPage(); try { await p.clock.install({ time: new Date(Date.now() + 3 * 86400000) }); await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const t = await p.evaluate(() => { const e = document.querySelector('[data-countdown]'); return e ? e.innerText.replace(/\s+/g, ' ') : null; });
    ok('L09-dong-ho-chu-ky', t === null || (!/Hết hạn/.test(t) && !/^0+\D+0+\D+0+\D+0+/.test(t.replace(/[^\d ]/g, '').trim())), 'đồng hồ sau 3 ngày: ' + t);
  } catch (e) { ok('L09', false, 'lỗi: ' + e.message.slice(0, 100)); } await ctx.close(); }
  // L10: từ skip link tới sản phẩm đầu ≤ 5 lần Tab (1440)
  { const ctx = await cr.newContext(VP.d1440); const p = await ctx.newPage(); try { await p.goto(BASE + '/collections/all', { waitUntil: 'load' }); await p.waitForTimeout(800);
    await p.keyboard.press('Tab'); const isSkip = await p.evaluate(() => { const a = document.activeElement; return !!a && /#main/.test(a.getAttribute('href') || ''); });
    let n = -1; if (isSkip) { await p.keyboard.press('Enter'); for (let i = 1; i <= 8; i++) { await p.keyboard.press('Tab'); const inCard = await p.evaluate(() => !!document.activeElement.closest('.pc-card, .pc-pcard, .item-product-main')); if (inCard) { n = i; break; } } }
    ok('L10-skip-toi-san-pham', isSkip && n > 0 && n <= 5, 'skip link đầu tiên=' + isSkip + ', số Tab tới SP đầu=' + n);
  } catch (e) { ok('L10', false, 'lỗi: ' + e.message.slice(0, 100)); } await ctx.close(); }
  // L15: popup voucher — Escape đóng, nút đóng ≥ 44px
  { const ctx = await mob(); const p = await ctx.newPage(); try { await p.goto(BASE + '/collections/all', { waitUntil: 'load' }); await p.waitForTimeout(800);
    const info = p.locator('.pc-voucher__info, [data-pc-modal-open]').first(); if (await info.count()) { await info.scrollIntoViewIfNeeded(); await info.click(); await p.waitForTimeout(500);
      const st = await p.evaluate(() => { const m = [...document.querySelectorAll('[role=dialog], .pc-modal, .popup-coupon')].find((e) => e.getBoundingClientRect().height > 0); if (!m) return null; const c = m.querySelector('button[aria-label*="Đóng"], .pc-modal__close, button[class*=close]'); const r = c ? c.getBoundingClientRect() : { width: 0, height: 0 }; return { closeW: Math.round(r.width), closeH: Math.round(r.height), focusIn: m.contains(document.activeElement) }; });
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      const open = await p.evaluate(() => [...document.querySelectorAll('[role=dialog], .pc-modal, .popup-coupon')].some((e) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== 'hidden'));
      ok('L15-popup-chuan', st && st.closeW >= 44 && st.closeH >= 44 && st.focusIn && !open, JSON.stringify(st) + ' còn mở sau Escape=' + open); } else ok('L15-popup-chuan', true, 'không có voucher trên trang'); } catch (e) { ok('L15', false, 'lỗi: ' + e.message.slice(0, 100)); } await ctx.close(); }
  return out;
}

// ── Tốc độ 4G (CDP: 1,6 Mbps, RTT 150ms, CPU 4×), trung vị 3 lần ───────────────────────
async function perf(cr) {
  const out = []; const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  for (const pth of PERF_PAGES) { const runs = [];
    for (let k = 0; k < 3; k++) { const ctx = await cr.newContext({ ...VP.m390, deviceScaleFactor: 3 }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
      await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await p.addInitScript(() => { window.__lcp = 0; window.__cls = 0; window.__tbt = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__tbt += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true }); } catch (e) {} });
      try { await p.goto(BASE + pth, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(2500);
        runs.push(await p.evaluate(() => { const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0; const kb = performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), performance.getEntriesByType('navigation')[0].transferSize || 0) / 1024; const blocking = document.querySelectorAll('head link[rel=stylesheet]:not([media=print]), head script[src]:not([async]):not([defer]):not([type=module])').length; const cdn = !!document.querySelector('script[src*="cdn.tailwindcss.com"]'); return { fcp: Math.round(fcp), lcp: Math.round(window.__lcp), tbt: Math.round(window.__tbt), cls: +window.__cls.toFixed(3), kb: Math.round(kb), blocking, cdn }; }));
      } catch (e) { runs.push({ fcp: 99999, lcp: 99999, tbt: 99999, cls: 9, kb: 0, blocking: 0, cdn: false, err: e.message.slice(0, 80) }); }
      await ctx.close(); }
    const r = { path: pth, fcp: med(runs.map((x) => x.fcp)), lcp: med(runs.map((x) => x.lcp)), tbt: med(runs.map((x) => x.tbt)), cls: med(runs.map((x) => x.cls)), kb: med(runs.map((x) => x.kb)), blocking: runs[0].blocking, tailwindCdn: runs[0].cdn };
    r.pass = r.fcp <= T.fcp && r.lcp <= T.lcp && r.tbt < T.tbt && r.cls <= T.cls && r.kb <= (pth === '/' ? T.homeKB : T.pageKB) && !r.tailwindCdn;
    out.push(r); process.stdout.write('p'); }
  return out;
}

// ── Link nội bộ ─────────────────────────────────────────────────────────────────
async function links() {
  const map = new Map();
  for (const p of PAGES) { try { const h = await (await fetch(BASE + p)).text(); for (const m of h.matchAll(/href=["']([^"'#]+)["']/g)) { let u = m[1].trim(); if (/^(mailto|tel|javascript|data|zalo|sms):/i.test(u) || u.startsWith('//')) continue; if (/^https?:/i.test(u)) { if (!u.startsWith(BASE)) continue; u = u.slice(BASE.length); } if (!u.startsWith('/') || /\.(css|js|png|jpe?g|webp|svg|ico|woff2?|xml|json|gif)(\?|$)/i.test(u) || u.startsWith('/assets/')) continue; if (!map.has(u)) map.set(u, new Set()); map.get(u).add(p); } } catch (e) {} }
  const bad = []; const arr = [...map.keys()];
  for (let i = 0; i < arr.length; i += 8) await Promise.all(arr.slice(i, i + 8).map(async (u) => { if (SAPO_SYSTEM.test(u)) return; try { const r = await fetch(BASE + u, { redirect: 'manual' }); let soft = false; if (r.status === 200) { const b = await r.text(); soft = /Oops! Trang bạn tìm kiếm không tồn tại|Không có template/.test(b); } if (r.status >= 400 || soft) bad.push({ url: u, status: soft ? '404 mềm' : r.status, from: [...map.get(u)].slice(0, 3) }); } catch (e) { bad.push({ url: u, status: 'ERR', from: [] }); } }));
  return { total: map.size, bad };
}

// ── Chạy ────────────────────────────────────────────────────────────────────────
async function main() {
  try { const r = await fetch(BASE + '/?tpl=index'); if (!r.ok) throw new Error('HTTP ' + r.status); } catch (e) { console.error(`[ui-verify] LỖI MÔI TRƯỜNG: không mở được ${BASE} (${e.message}). Chạy npm run preview trước.`); process.exit(2); }
  const cr = await chromium.launch(); const wk = await webkit.launch().catch(() => null);
  if (!wk) { console.error('[ui-verify] LỖI MÔI TRƯỜNG: chưa cài WebKit (npx playwright install webkit)'); process.exit(2); }
  const report = { stamp: STAMP, base: BASE, mode: has('--full') ? 'full' : has('--quick') ? 'quick' : 'part', pages: [], flows: [], perf: [], links: null };
  const full = has('--full');
  const quickPaths = has('--quick') ? (args.filter((a) => a.startsWith('/')).length ? args.filter((a) => a.startsWith('/')) : QUICK_DEFAULT) : [];
  if (full || quickPaths.length) {
    const list = full ? PAGES : quickPaths;
    for (const p of list) { report.pages.push(await checkPage(cr, 'm390', p, { shot: true })); report.pages.push(await checkPage(cr, 'd1440', p, { shot: true, focus: true })); process.stdout.write('.'); }
    if (quickPaths.length) for (const p of quickPaths) { const r = await checkPage(wk, 'm390', p, { device: devices['iPhone 13'], noAxe: true, shot: true }); r.vp = 'webkit390'; report.pages.push(r); }
    if (full) for (const vp of ['m320', 't768', 'd1024', 'land']) for (const p of RESP_PAGES) { report.pages.push(await checkPage(cr, vp, p, { noAxe: true })); process.stdout.write(','); }
  }
  if (full || has('--flows') || quickPaths.length) report.flows = await flows(cr, wk);
  if (full || has('--perf')) report.perf = await perf(cr);
  if (full || has('--links')) report.links = await links();
  await cr.close(); await wk.close();
  fs.mkdirSync(OUT, { recursive: true }); const outFile = path.join(OUT, STAMP + '.json'); fs.writeFileSync(outFile, JSON.stringify(report, null, 1));

  // So baseline: lỗi mới = chỉ số (trang × khung × loại) tăng so với baseline
  const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;
  const key = (r) => r.vp + ' ' + r.path; const bIdx = new Map(); if (base) base.pages.forEach((r) => bIdx.set(key(r), r));
  const newer = [], fixed = []; let total = 0;
  for (const r of report.pages) { const b = bIdx.get(key(r)); for (const [k, n] of Object.entries(r.issues || {})) { total += n; const was = b ? (b.issues[k] || 0) : null; if (was !== null && n > was) newer.push(`${key(r)}  ${k}: ${was} → ${n}  ${(r.samples[k] || []).slice(0, 2).join(' | ')}`); } if (b) for (const [k, n] of Object.entries(b.issues || {})) { const now = (r.issues || {})[k] || 0; if (now < n) fixed.push(`${key(r)}  ${k}: ${n} → ${now}`); } }
  if (base && base.flows) { const bf = new Map(base.flows.map((f) => [f.flow, f.pass])); report.flows.forEach((f) => { if (bf.get(f.flow) === true && !f.pass) newer.push(`luồng ${f.flow}: đạt → KHÔNG ĐẠT (${f.detail})`); }); }
  if (base && base.perf && report.perf.length) { const bp = new Map(base.perf.map((x) => [x.path, x])); report.perf.forEach((x) => { const b = bp.get(x.path); if (b && x.lcp > b.lcp * 1.1) newer.push(`tốc độ ${x.path}: LCP ${b.lcp} → ${x.lcp}ms (+>10%)`); }); }

  const failedFlows = report.flows.filter((f) => !f.pass); const failedPerf = report.perf.filter((x) => !x.pass); const badLinks = report.links ? report.links.bad : [];
  console.log(`\n[ui-verify] ${report.mode} — ${report.pages.length} lượt trang, tổng chỉ số lỗi ${total}; luồng ${report.flows.length - failedFlows.length}/${report.flows.length} đạt; tốc độ ${report.perf.length - failedPerf.length}/${report.perf.length} đạt; link hỏng ${badLinks.length}`);
  const agg = {}; report.pages.forEach((r) => Object.entries(r.issues || {}).forEach(([k, n]) => { agg[k] = (agg[k] || 0) + n; }));
  console.log('Theo loại:', Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + '=' + n).join(' · ') || '0');
  failedFlows.forEach((f) => console.log('  ✗ luồng', f.flow, '—', f.detail));
  failedPerf.forEach((x) => console.log(`  ✗ tốc độ ${x.path}: FCP ${x.fcp} LCP ${x.lcp} TBT ${x.tbt} CLS ${x.cls} ${x.kb}KB${x.tailwindCdn ? ' TailwindCDN' : ''}`));
  badLinks.slice(0, 15).forEach((l) => console.log('  ✗ link', l.url, l.status, '← ' + l.from.join(' ')));
  if (base) { console.log(`So baseline (${base.stamp}): ${newer.length} lỗi MỚI, ${fixed.length} chỉ số giảm.`); newer.slice(0, 40).forEach((s) => console.log('  + ' + s)); }
  else console.log('Chưa có baseline (ui-loop/baseline.json).');
  console.log('Báo cáo:', path.relative(ROOT, outFile), ' Ảnh:', path.relative(ROOT, SHOTS));

  if (has('--write-baseline')) {
    if (base && !full) { // --quick: chỉ thay các (khung × trang) vừa kiểm + kết quả luồng, giữ phần còn lại của baseline full
      const idx = new Map(base.pages.map((r, i) => [key(r), i])); report.pages.forEach((r) => { if (idx.has(key(r))) base.pages[idx.get(key(r))] = r; else base.pages.push(r); });
      if (report.flows.length) { const fi = new Map(base.flows.map((f, i) => [f.flow, i])); report.flows.forEach((f) => { if (fi.has(f.flow)) base.flows[fi.get(f.flow)] = f; else base.flows.push(f); }); }
      if (report.perf.length) base.perf = report.perf; if (report.links) base.links = report.links; base.updated = STAMP;
      fs.writeFileSync(BASELINE, JSON.stringify(base, null, 1)); console.log('Đã cập nhật baseline (trộn ' + report.pages.length + ' lượt trang).');
    } else { fs.writeFileSync(BASELINE, JSON.stringify(report, null, 1)); console.log('Đã ghi baseline.'); }
  }
  const clean = total === 0 && failedFlows.length === 0 && failedPerf.length === 0 && badLinks.length === 0;
  if (full) { console.log(clean ? 'KẾT LUẬN: SẠCH' : 'KẾT LUẬN: CHƯA SẠCH'); process.exit(clean ? 0 : 1); }
  process.exit(newer.length ? 1 : 0);
}
main().catch((e) => { console.error('[ui-verify] LỖI MÔI TRƯỜNG:', e.message); process.exit(2); });
