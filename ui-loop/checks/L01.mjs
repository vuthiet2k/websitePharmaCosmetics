#!/usr/bin/env node
/*
  ui-loop/checks/L01.mjs — kiểm việc L01 (G.7): mobile có lối vào danh mục sản phẩm.
    (a) < 1024: bấm ☰ ⇒ drawer hiện cây menu `main-menu` (settings.header_nav_cate, data/sapo-menus.json) — 5 nhóm cấp 1 nhìn thấy;
        bấm nhóm "MUA SẮM THEO DANH MỤC" ⇒ ≥ 5 link danh mục con nhìn thấy, đúng URL trong menu `mua-sam-theo-danh-muc`;
        bấm 1 link danh mục ⇒ HTTP 200 + h1 nhìn thấy. (Sapo dùng URL gốc `/<handle>`, không `/collections/`.)
    (b) Escape ⇒ drawer đóng, focus về #btn-menu-mobile.
    (c) thanh đáy: đúng 4 mục Trang chủ · Danh mục · Soi da & Dịch vụ · Tài khoản; Danh mục ⇒ /collections/all 200 h1 "Tất cả sản phẩm";
        Soi da & Dịch vụ ⇒ /truoc-sau-cham-soc-da-tu-xa 200 (trang "DỊCH VỤ" của menu header).
    (d) 844×390: cây danh mục có trong drawer.
    (e) ≥ 1024: nút "Danh mục" mega-menu desktop vẫn mở, số link nhìn thấy = lúc trước khi sửa (evidence/L01/before.json).
  Khung: Chromium 390×844 / 320×568 / 768×1024 / 844×390 / 1024×768 / 1440×900 + WebKit iPhone 13.
  Ảnh: ui-loop/evidence/L01/<mode>-<trình duyệt>-<khung>-{menu,nav}.png
  Chạy: node ui-loop/checks/L01.mjs [before|after]
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'L01');
fs.mkdirSync(EVD, { recursive: true });
const BASE = 'http://localhost:3000';
const MODE = process.argv[2] || 'after';
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

// Cây menu mong đợi lấy thẳng từ snapshot menu Sapo (không ghi tay danh sách link)
const MENUS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'sapo-menus.json'), 'utf8'));
const TOP = MENUS['main-menu'].links.map((l) => l.title);
const GROUP = 'MUA SẮM THEO DANH MỤC';
const CHILD_URLS = new Set(MENUS['mua-sam-theo-danh-muc'].links.map((l) => l.url));
const NAV_EXPECT = ['Trang chủ', 'Danh mục', 'Soi da & Dịch vụ', 'Tài khoản'];

const FRAMES = [
  { name: 'chromium-390', br: 'chromium', opt: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  { name: 'webkit-iphone13', br: 'webkit', opt: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', br: 'chromium', opt: { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-768', br: 'chromium', opt: { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-844x390', br: 'chromium', opt: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-1024', br: 'chromium', opt: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', br: 'chromium', opt: { viewport: { width: 1440, height: 900 } } },
];

// Phần tử nhìn thấy: có kích thước, không tổ tiên display:none / visibility:hidden, giao khung nhìn ngang
const VIS = `(a) => { const r = a.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.right <= 0 || r.left >= innerWidth) return false;
  for (let e = a; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false; } return true; }`;

const open = async (page, url) => {
  const res = await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  return res;
};

const h1Visible = (page) => page.evaluate(`(() => { const vis = ${VIS}; const h = [...document.querySelectorAll('h1')].filter(vis); return h.map((x) => x.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60)); })()`);

const before = MODE === 'after' && fs.existsSync(path.join(EVD, 'before.json')) ? JSON.parse(fs.readFileSync(path.join(EVD, 'before.json'), 'utf8')) : {};
const result = {};

for (const f of FRAMES) {
  console.log(`\n=== ${f.name} ===`);
  const browser = await (f.br === 'webkit' ? webkit : chromium).launch();
  const ctx = await browser.newContext({ ...f.opt, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const w = f.opt.viewport.width;
  const rec = (result[f.name] = {});
  try {
    await open(page, '/');
    if (w < 1024) {
      // (a) menu ☰ — chờ drawer trượt vào khung nhìn (WebKit lần nạp đầu có lúc > 700ms), ghi thời gian mở
      const t0 = Date.now();
      await page.click('#btn-menu-mobile');
      await page.waitForFunction(() => document.querySelector('.header-menu').getBoundingClientRect().left >= 0, null, { timeout: 3000 }).catch(() => {});
      rec.openMs = Date.now() - t0;
      // WebKit: nội dung drawer còn visibility:hidden (chuyển tiếp CSS cũ) thêm một lúc sau khi trượt vào — áp cho cả menu chính #nav.
      // Chờ tối đa 4s tới khi link đầu của cây danh mục và của #nav hết ẩn, ghi thời gian từng cái.
      const visMs = await page.evaluate(`new Promise((done) => { const s = performance.now(); const out = {}; const vis = ${VIS};
        const tick = () => { const now = Math.round(performance.now() - s);
          const c = document.querySelector('#header-category-menu .sudes-main-cate > li > a'), n = document.querySelector('#nav > li > a');
          if (out.cate == null && c && vis(c)) out.cate = now; if (out.nav == null && n && vis(n)) out.nav = now;
          if ((out.cate != null && out.nav != null) || now > 4000) done(out); else requestAnimationFrame(tick); }; tick(); })`);
      rec.visMs = visMs;
      console.log(`  drawer vào khung nhìn sau ${rec.openMs} ms; hết ẩn thêm: cây danh mục ${visMs.cate ?? '> 4000'} ms, menu chính #nav ${visMs.nav ?? '> 4000'} ms`);
      const top = await page.evaluate(`(() => { const vis = ${VIS}; return [...document.querySelectorAll('#header-category-menu .sudes-main-cate > li > a')].filter(vis).map((a) => ({ t: a.textContent.trim().replace(/\\s+/g, ' '), h: Math.round(a.getBoundingClientRect().height) })); })()`);
      rec.top = top;
      console.log('  nhóm cấp 1 nhìn thấy:', top.map((x) => `${x.t} (${x.h}px)`).join(' · ') || '(không có)');
      if (MODE === 'before') { await page.screenshot({ path: path.join(EVD, `before-${f.name}-menu.png`) }); }
      else {
        ok(TOP.every((t) => top.some((x) => x.t === t)), `${TOP.length}/${TOP.length} nhóm cấp 1 của main-menu nhìn thấy (thấy ${top.length})`);
        const grp = page.locator('#header-category-menu .sudes-main-cate > li', { hasText: GROUP }).first();
        await grp.locator('> a').click(); await page.waitForTimeout(700);
        const kids = await page.evaluate(`(() => { const vis = ${VIS}; const li = [...document.querySelectorAll('#header-category-menu .sudes-main-cate > li')].find((x) => x.querySelector(':scope > a')?.textContent.includes(${JSON.stringify(GROUP)}));
          return [...li.querySelectorAll('.menu-child a')].filter(vis).map((a) => ({ href: a.getAttribute('href'), t: a.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40), h: Math.round(a.getBoundingClientRect().height) })); })()`);
        const inMenu = kids.filter((k) => CHILD_URLS.has(k.href));
        rec.kids = kids.length; rec.kidsInMenu = inMenu.length; rec.kidH = kids.map((k) => k.h);
        ok(inMenu.length >= 5, `bấm "${GROUP}" ⇒ ${kids.length} link con nhìn thấy, ${inMenu.length} đúng URL menu mua-sam-theo-danh-muc (cần ≥ 5); cao ${Math.min(...rec.kidH)}–${Math.max(...rec.kidH)}px`);
        await page.screenshot({ path: path.join(EVD, `after-${f.name}-menu.png`) });
        // bấm 1 danh mục
        const first = page.locator(`#header-category-menu .menu-child a[href="${inMenu[0]?.href}"]`).first();
        await first.scrollIntoViewIfNeeded();
        const [resp] = await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), first.click()]);
        await page.waitForTimeout(500);
        const h1 = await h1Visible(page);
        rec.catNav = { url: new URL(page.url()).pathname, status: resp?.status(), h1 };
        ok(resp?.status() === 200 && h1.length === 1 && new URL(page.url()).pathname === inMenu[0]?.href, `bấm "${inMenu[0]?.t}" ⇒ ${new URL(page.url()).pathname} HTTP ${resp?.status()}, h1 "${h1[0] || ''}"`);
        // (b) Escape
        await open(page, '/');
        await page.click('#btn-menu-mobile'); await page.waitForTimeout(700);
        await page.keyboard.press('Escape'); await page.waitForTimeout(500);
        const esc = await page.evaluate(() => { const m = document.querySelector('.header-menu'); const r = m.getBoundingClientRect(); return { cur: m.classList.contains('current'), inView: r.right > 1 && r.left < innerWidth - 1 && getComputedStyle(m).visibility !== 'hidden', focus: document.activeElement?.id }; });
        rec.esc = esc;
        ok(!esc.cur && !esc.inView && esc.focus === 'btn-menu-mobile', `Escape: .current ${esc.cur}, drawer trong khung nhìn ${esc.inView}, focus #${esc.focus}`);
      }
      // (c) thanh đáy
      if (f.name !== 'chromium-844x390') {
        const nav = await page.evaluate(`(() => { const vis = ${VIS}; return [...document.querySelectorAll('.pc-bottom-nav a, .pc-bottomnav a')].filter(vis).map((a) => ({ t: (a.querySelector('[class*=label]') || a).textContent.trim(), href: a.getAttribute('href') })); })()`);
        rec.nav = nav;
        console.log('  thanh đáy:', nav.map((x) => `${x.t} → ${x.href}`).join(' · '));
        await page.screenshot({ path: path.join(EVD, `${MODE}-${f.name}-nav.png`) });
        if (MODE !== 'before') {
          ok(JSON.stringify(nav.map((x) => x.t)) === JSON.stringify(NAV_EXPECT), `thanh đáy đúng 4 mục theo thứ tự C.2`);
          for (const [label, path0, h1want] of [['Danh mục', '/collections/all', 'Tất cả sản phẩm'], ['Soi da & Dịch vụ', '/truoc-sau-cham-soc-da-tu-xa', null]]) {
            await open(page, '/');
            const a = page.locator('.pc-bottom-nav a, .pc-bottomnav a').filter({ hasText: label }).first();
            const [resp] = await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), a.click()]);
            await page.waitForTimeout(400);
            const h1 = await h1Visible(page); const p = new URL(page.url()).pathname;
            rec['nav_' + label] = { p, status: resp?.status(), h1 };
            ok(resp?.status() === 200 && p === path0 && h1.length === 1 && (!h1want || h1[0] === h1want), `thanh đáy "${label}" ⇒ ${p} HTTP ${resp?.status()}, h1 "${h1[0] || ''}"`);
          }
        }
      } else if (MODE !== 'before') {
        // (d) màn ngang: đã kiểm ở (a)
      }
    } else {
      // (e) mega-menu desktop
      const btn = page.locator('.js-menu-toggle').first();
      await btn.click(); await page.waitForTimeout(800);
      const n = await page.evaluate(`(() => { const vis = ${VIS}; return [...document.querySelectorAll('#header-category-menu a')].filter(vis).length; })()`);
      const exp = await btn.getAttribute('aria-expanded');
      rec.desk = { links: n, expanded: exp };
      await page.screenshot({ path: path.join(EVD, `${MODE}-${f.name}-menu.png`) });
      console.log(`  mega-menu: aria-expanded ${exp}, ${n} link nhìn thấy`);
      if (MODE !== 'before') ok(exp === 'true' && n > 0 && n === before[f.name]?.desk?.links, `mega-menu desktop mở, link nhìn thấy trước ${before[f.name]?.desk?.links} = sau ${n}`);
    }
    if (MODE !== 'before') ok(errs.length === 0, `0 lỗi JS (${errs.length}) ${errs.slice(0, 2).join(' | ')}`);
  } catch (e) { ok(false, 'lỗi chạy: ' + e.message.split('\n')[0]); }
  await browser.close();
}

if (MODE === 'before') fs.writeFileSync(path.join(EVD, 'before.json'), JSON.stringify(result, null, 1));
else fs.writeFileSync(path.join(EVD, 'after.json'), JSON.stringify(result, null, 1));
console.log(MODE === 'before' ? '\nĐã ghi evidence/L01/before.json' : `\n${fail ? 'CHƯA ĐẠT: ' + fail + ' mục' : 'ĐẠT toàn bộ'}`);
process.exit(fail ? 1 : 0);
