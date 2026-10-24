#!/usr/bin/env node
/*
  ui-loop/checks/N16.mjs — kiểm việc N16: cây danh mục `main-menu` trong drawer ☰ mobile (D.6 + D.8 + B.7).
    < 1024 (Chromium 390 / 320 / 768 / 844×390 + WebKit iPhone 13), bấm ☰:
      (1) link cấp 1 nhìn thấy cao ≥ 44px;
      (2) mở từng nhóm có con (bấm mục; nhóm đầu thử thêm bấm icon): link con nhìn thấy cao 44–56px;
      (3) `.open_mnu` chỉ ở mục có ≥ 1 link con; tâm dọc icon lệch tâm link ≤ 2px;
      (4) ô ảnh / ô thay thế trong link con cao ≤ 32px;
      (5) 844×390: vùng cuộn drawer phần không bị thanh đáy che ≥ 50% khung, cuộn tới được mục cuối;
      (6) chỉ 1 link "TRANG CHỦ" nhìn thấy trong drawer;
      (7) bấm 1 danh mục ⇒ HTTP 200 + h1; Escape đóng + focus ☰; 0 lỗi JS.
    ≥ 1024 (1024×768, 1440×900): (8) mọi link mega-menu Danh mục + menu ngang (trừ TRANG CHỦ của cây danh mục) giữ chữ + cao
      (lệch ≤ 1px so evidence/N16/before.json).
  Ảnh: ui-loop/evidence/N16/<mode>-<trình duyệt>-<khung>[-open].png
  Chạy: node ui-loop/checks/N16.mjs [before|after]
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N16');
fs.mkdirSync(EVD, { recursive: true });
const BASE = 'http://localhost:3000';
const MODE = process.argv[2] || 'after';
const AFTER = MODE !== 'before';
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (AFTER && !cond) fail++; };

const FRAMES = [
  { name: 'chromium-390', br: 'chromium', opt: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  { name: 'webkit-iphone13', br: 'webkit', opt: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', br: 'chromium', opt: { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-768', br: 'chromium', opt: { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-844x390', br: 'chromium', opt: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
  { name: 'chromium-1024', br: 'chromium', opt: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', br: 'chromium', opt: { viewport: { width: 1440, height: 900 } } },
];

const VIS = `(a) => { const r = a.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.right <= 0 || r.left >= innerWidth) return false;
  for (let e = a; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false; } return true; }`;
const TXT = `(a) => a.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40)`;

const open = async (page, url) => {
  const res = await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  return res;
};
const openDrawer = async (page) => {
  await page.click('#btn-menu-mobile');
  await page.waitForFunction(`(() => { const vis = ${VIS}; const a = document.querySelector('#header-category-menu .sudes-main-cate > li > a'); return document.querySelector('.header-menu').getBoundingClientRect().left >= 0 && a && vis(a); })()`, null, { timeout: 5000 }).catch(() => {});
};

const before = AFTER && fs.existsSync(path.join(EVD, 'before.json')) ? JSON.parse(fs.readFileSync(path.join(EVD, 'before.json'), 'utf8')) : {};
const result = {};

for (const f of FRAMES) {
  console.log(`\n=== ${f.name} ===`);
  const browser = await (f.br === 'webkit' ? webkit : chromium).launch();
  const ctx = await browser.newContext({ ...f.opt, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const w = f.opt.viewport.width, H = f.opt.viewport.height;
  const rec = (result[f.name] = {});
  try {
    await open(page, '/');
    if (w < 1024) {
      await openDrawer(page);
      // (1) cấp 1 + (3) icon + (6) TRANG CHỦ
      const top = await page.evaluate(`(() => { const vis = ${VIS}, txt = ${TXT};
        return [...document.querySelectorAll('#header-category-menu .sudes-main-cate > li')].filter((li) => vis(li.querySelector(':scope > a'))).map((li) => {
          const a = li.querySelector(':scope > a'), ic = li.querySelector(':scope > .open_mnu'), r = a.getBoundingClientRect();
          const kids = li.querySelectorAll(':scope > ul > li > a').length; const ir = ic && vis(ic) ? ic.getBoundingClientRect() : null;
          return { t: txt(a), h: +r.height.toFixed(1), kids, icon: !!ir, iconOff: ir ? +Math.abs((ir.top + ir.height / 2) - (r.top + r.height / 2)).toFixed(1) : null, iconW: ir ? Math.round(ir.width) : null, iconH: ir ? Math.round(ir.height) : null };
        }); })()`);
      rec.top = top;
      console.log('  cấp 1:', top.map((x) => `${x.t} ${x.h}px${x.icon ? ` icon ${x.iconW}×${x.iconH} lệch ${x.iconOff}` : ''} (${x.kids} con)`).join(' · '));
      ok(top.length > 0 && top.every((x) => x.h >= 44), `(1) ${top.length} link cấp 1 cao ≥ 44px (thấp nhất ${Math.min(...top.map((x) => x.h))}px)`);
      const homes = await page.evaluate(`(() => { const vis = ${VIS}; return [...document.querySelectorAll('.header-menu a')].filter((a) => vis(a) && /^trang chủ$/i.test(a.textContent.trim())).length; })()`);
      rec.homes = homes;
      ok(homes === 1, `(6) link "TRANG CHỦ" nhìn thấy trong drawer: ${homes}`);
      await page.screenshot({ path: path.join(EVD, `${MODE}-${f.name}.png`) });

      // (2)(3)(4) mở từng nhóm có con
      const groups = top.filter((x) => x.kids > 0);
      rec.groups = [];
      for (const [gi, g] of groups.entries()) {
        const li = page.locator('#header-category-menu .sudes-main-cate > li', { has: page.locator(':scope > a', { hasText: g.t }) }).first();
        // nhóm đầu: bấm icon; nhóm sau: bấm mục
        if (gi === 0 && g.icon) await li.locator(':scope > .open_mnu').click(); else await li.locator(':scope > a').click();
        await page.waitForTimeout(600);
        const kid = await page.evaluate(`((t) => { const vis = ${VIS}, txt = ${TXT};
          const li = [...document.querySelectorAll('#header-category-menu .sudes-main-cate > li')].find((x) => txt(x.querySelector(':scope > a')) === t);
          return [...li.querySelectorAll(':scope > ul > li')].filter((k) => vis(k.querySelector(':scope > a'))).map((k) => { const a = k.querySelector(':scope > a'), r = a.getBoundingClientRect();
            const im = a.querySelector('.image'); const ic = k.querySelector(':scope > .open_mnu'); const ir = ic && vis(ic) ? ic.getBoundingClientRect() : null;
            return { t: txt(a), h: +r.height.toFixed(1), img: im && vis(im) ? Math.round(im.getBoundingClientRect().height) : 0, kids: k.querySelectorAll(':scope > ul > li > a').length, icon: !!ir,
              iconOff: ir ? +Math.abs((ir.top + ir.height / 2) - (r.top + r.height / 2)).toFixed(1) : null }; }); })(${JSON.stringify(g.t)})`);
        rec.groups.push({ g: g.t, by: gi === 0 && g.icon ? 'icon' : 'mục', kid });
        const hs = kid.map((k) => k.h), ims = kid.map((k) => k.img);
        console.log(`  nhóm "${g.t}" (bấm ${gi === 0 && g.icon ? 'icon' : 'mục'}): ${kid.length} link con, cao ${Math.min(...hs)}–${Math.max(...hs)}px, ô ảnh ${Math.min(...ims)}–${Math.max(...ims)}px, icon ${kid.filter((k) => k.icon).length} (con có cháu ${kid.filter((k) => k.kids > 0).length})`);
        if (AFTER) {
          ok(kid.length > 0 && hs.every((h) => h >= 44 && h <= 56), `(2) "${g.t}": ${kid.length} link con mở được, cao ${Math.min(...hs)}–${Math.max(...hs)}px (cần 44–56)`);
          ok(kid.every((k) => k.icon === (k.kids > 0)) && kid.filter((k) => k.icon).every((k) => k.iconOff <= 2), `(3) "${g.t}": icon chỉ ở link con có cháu (${kid.filter((k) => k.icon).length} icon / ${kid.filter((k) => k.kids > 0).length} có cháu)`);
          ok(ims.every((h) => h <= 32), `(4) "${g.t}": ô ảnh link con ≤ 32px (cao nhất ${Math.max(...ims)}px)`);
        }
        if (gi === 0) await page.screenshot({ path: path.join(EVD, `${MODE}-${f.name}-open.png`) });
        // đóng lại để nhóm sau đo từ đầu
        await li.locator(':scope > a').click(); await page.waitForTimeout(400);
      }
      if (AFTER) ok(top.every((x) => x.icon === (x.kids > 0)) && top.filter((x) => x.icon).every((x) => x.iconOff <= 2), `(3) cấp 1: icon chỉ ở mục có con (${top.filter((x) => x.icon).length}/${groups.length}), lệch tâm ≤ 2px (lớn nhất ${Math.max(0, ...top.filter((x) => x.icon).map((x) => x.iconOff))}px)`);

      // (5) vùng cuộn drawer
      const sc = await page.evaluate(`(() => { const vis = ${VIS}; const row = document.querySelector('.navigation-horizontal > .row'); const r = row.getBoundingClientRect();
        const bn = [...document.querySelectorAll('.pc-bottom-nav, .pc-bottomnav')].find(vis); const bt = bn ? bn.getBoundingClientRect().top : innerHeight;
        const visH = Math.max(0, Math.min(r.bottom, bt, innerHeight) - Math.max(r.top, 0));
        row.scrollTop = row.scrollHeight; const items = [...row.querySelectorAll('a, button')].filter(vis); const last = items[items.length - 1]; const lr = last ? last.getBoundingClientRect() : null;
        const out = { rowH: Math.round(r.height), visH: Math.round(visH), scrollH: row.scrollHeight, last: last ? last.textContent.trim().replace(/\\s+/g, ' ').slice(0, 20) : null, lastBottom: lr ? Math.round(lr.bottom) : null, limit: Math.round(Math.min(r.bottom, bt, innerHeight)) };
        row.scrollTop = 0; return out; })()`);
      rec.scroll = sc;
      console.log(`  vùng cuộn drawer: cao ${sc.rowH}px, nhìn thấy (không bị thanh đáy che) ${sc.visH}px / ${H}px; cuộn hết: mục cuối "${sc.last}" đáy ${sc.lastBottom}px (giới hạn ${sc.limit}px)`);
      if (AFTER && f.name === 'chromium-844x390') ok(sc.visH >= H * 0.5 && sc.lastBottom <= sc.limit + 1, `(5) 844×390 vùng cuộn nhìn thấy ${sc.visH}px ≥ ${H * 0.5}px, mục cuối cuộn tới được (đáy ${sc.lastBottom} ≤ ${sc.limit})`);
      if (f.name === 'chromium-844x390') await page.screenshot({ path: path.join(EVD, `${MODE}-${f.name}-scroll.png`) });

      if (AFTER) {
        // (7) bấm danh mục, Escape
        const g0 = groups[0];
        const li = page.locator('#header-category-menu .sudes-main-cate > li', { has: page.locator(':scope > a', { hasText: g0.t }) }).first();
        await li.locator(':scope > a').click(); await page.waitForTimeout(600);
        const first = li.locator(':scope > ul > li > a').first();
        const href = await first.getAttribute('href');
        await first.scrollIntoViewIfNeeded();
        const [resp] = await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), first.click()]);
        await page.waitForTimeout(400);
        const h1 = await page.evaluate(`(() => { const vis = ${VIS}; return [...document.querySelectorAll('h1')].filter(vis).map((h) => h.textContent.trim().slice(0, 40)); })()`);
        rec.nav = { href, status: resp?.status(), h1 };
        ok(resp?.status() === 200 && h1.length === 1 && new URL(page.url()).pathname === href, `(7) bấm "${href}" ⇒ HTTP ${resp?.status()}, h1 "${h1[0] || ''}"`);
        await open(page, '/'); await openDrawer(page);
        await page.keyboard.press('Escape'); await page.waitForTimeout(500);
        const esc = await page.evaluate(() => { const m = document.querySelector('.header-menu'); const r = m.getBoundingClientRect(); return { cur: m.classList.contains('current'), inView: r.right > 1 && r.left < innerWidth - 1 && getComputedStyle(m).visibility !== 'hidden', focus: document.activeElement?.id }; });
        rec.esc = esc;
        ok(!esc.cur && !esc.inView && esc.focus === 'btn-menu-mobile', `(7) Escape: drawer đóng (${!esc.inView}), focus #${esc.focus}`);
      }
    } else {
      // (8) desktop: menu ngang + mega-menu
      const navL = await page.evaluate(`(() => { const vis = ${VIS}, txt = ${TXT}; return [...document.querySelectorAll('#nav > li > a')].filter(vis).map((a) => ({ t: txt(a), h: +a.getBoundingClientRect().height.toFixed(1), w: +a.getBoundingClientRect().width.toFixed(1) })); })()`);
      await page.locator('.js-menu-toggle').first().click(); await page.waitForTimeout(800);
      const mega = await page.evaluate(`(() => { const vis = ${VIS}, txt = ${TXT}; return [...document.querySelectorAll('#header-category-menu a')].filter(vis).map((a) => ({ t: txt(a), h: +a.getBoundingClientRect().height.toFixed(1), w: +a.getBoundingClientRect().width.toFixed(1) })); })()`);
      rec.desk = { navL, mega };
      await page.screenshot({ path: path.join(EVD, `${MODE}-${f.name}.png`) });
      console.log(`  menu ngang ${navL.length} link; mega-menu ${mega.length} link: ${mega.map((x) => x.t + ' ' + x.h).join(' | ')}`);
      if (AFTER) {
        const b = before[f.name]?.desk;
        const exp = { navL: b.navL, mega: b.mega.filter((x, i) => !(i === 0 && /^trang chủ$/i.test(x.t))) };
        const same = (A, B) => A.length === B.length && A.every((x, i) => x.t === B[i].t && Math.abs(x.h - B[i].h) <= 1 && Math.abs(x.w - B[i].w) <= 1);
        ok(same(navL, exp.navL), `(8) menu ngang ${navL.length} link giữ chữ + cỡ (trước ${exp.navL.length})`);
        ok(same(mega, exp.mega), `(8) mega-menu ${mega.length} link = trước ${b.mega.length} trừ TRANG CHỦ, giữ chữ + cỡ ±1px`);
      }
    }
    ok(errs.length === 0, `0 lỗi JS (${errs.length}) ${errs.slice(0, 2).join(' | ')}`);
  } catch (e) { ok(false, 'lỗi chạy: ' + e.message.split('\n')[0]); fail += AFTER ? 0 : 0; }
  await browser.close();
}

fs.writeFileSync(path.join(EVD, `${AFTER ? 'after' : 'before'}.json`), JSON.stringify(result, null, 1));
console.log(AFTER ? `\n${fail ? 'CHƯA ĐẠT: ' + fail + ' mục' : 'ĐẠT toàn bộ'}` : '\nĐã ghi evidence/N16/before.json');
process.exit(fail ? 1 : 0);
