#!/usr/bin/env node
/*
  ui-loop/checks/N17.mjs — kiểm việc N17: drawer ☰ hiện trễ khi giảm chuyển động (D.19 + B.7, phương án A đã duyệt 24/10/2026).
    < 1024 (Chromium 390 / 320 / 768 / 844×390 + WebKit iPhone 13), mỗi khung 2 chế độ reducedMotion no-preference + reduce, bấm ☰:
      (1) link đầu cây danh mục `#header-category-menu .sudes-main-cate > li > a` và `#nav > li > a` nhìn thấy
          (không tổ tiên visibility:hidden / display:none / opacity 0) ≤ 400ms sau sự kiện click (đo trong trang bằng rAF;
          riêng WebKit no-preference đo bằng setTimeout + getComputedStyle theo quyết định N17-a 25/10/2026);
      (2) Escape đóng drawer (link hết nhìn thấy) + focus về ☰.
    Mọi khung (reduce): (3) 4 Swiper đầu trang chủ slideNext ×3 cho chuỗi chỉ số giống hệt khi chèn lại quy tắc cũ `.01ms`
        (đối chứng HEAD trong cùng trang, kể cả cờ `animating`); (4) 0 lỗi JS.
    (5) quy tắc đang áp dụng: transition-duration của `a` khi reduce = 0s.
  Ảnh: ui-loop/evidence/N17/after-<trình duyệt>-<khung>.png (reduce, drawer mở ở < 1024).
  Chạy: node ui-loop/checks/N17.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N17');
fs.mkdirSync(EVD, { recursive: true });
const BASE = 'http://localhost:3000';
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

const FRAMES = [
  { name: '390', br: 'chromium', opt: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  { name: 'iphone13', br: 'webkit', opt: { ...devices['iPhone 13'] } },
  { name: '320', br: 'chromium', opt: { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true } },
  { name: '768', br: 'chromium', opt: { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true } },
  { name: '844x390', br: 'chromium', opt: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
  { name: '1024', br: 'chromium', opt: { viewport: { width: 1024, height: 768 } } },
  { name: '1440', br: 'chromium', opt: { viewport: { width: 1440, height: 900 } } },
];
const OLD_RULE = '@media (prefers-reduced-motion: reduce){*,*::before,*::after{transition-duration:.01ms!important}}';
const SEL = ['#header-category-menu .sudes-main-cate > li > a', '#nav > li > a'];

const VIS_FN = `window.__vis = (a) => { if (!a) return false; const r = a.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.right <= 0 || r.left >= innerWidth) return false;
  for (let e = a; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false; } return true; };`;

const swiperSeq = (p) => p.evaluate(async () => {
  const out = [];
  for (const el of [...document.querySelectorAll('.swiper-container, .swiper')].filter((x) => x.swiper && x.swiper.slides.length > 2).slice(0, 4)) {
    const sw = el.swiper; sw.slideTo(0, 0); await new Promise((d) => setTimeout(d, 50)); const seq = [sw.activeIndex];
    for (let i = 0; i < 3; i++) { sw.slideNext(); await new Promise((d) => setTimeout(d, 400)); seq.push(sw.activeIndex); }
    out.push(`${el.className.split(' ').slice(0, 2).join('.')} ${seq.join('→')} animating=${sw.animating}`);
  }
  return out;
});

const summary = [];
for (const f of FRAMES) {
  const bt = f.br === 'webkit' ? webkit : chromium;
  const b = await bt.launch();
  const mobile = f.opt.viewport.width < 1024;
  console.log(`\n=== ${f.br}-${f.name}`);
  for (const rm of ['no-preference', 'reduce']) {
    const ctx = await b.newContext({ ...f.opt, reducedMotion: rm });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(1200);
    await p.evaluate(VIS_FN);
    const td = await p.evaluate(() => getComputedStyle(document.querySelector('a')).transitionDuration);
    if (rm === 'reduce') ok(td.split(',').every((x) => parseFloat(x) === 0), `(5) [${rm}] transition-duration của a = ${td}`);
    if (mobile) {
      await p.evaluate(() => { window.__t0 = null; document.addEventListener('click', (e) => { if (e.target.closest('#btn-menu-mobile') && window.__t0 == null) window.__t0 = performance.now(); }, true); });
      await p.click('#btn-menu-mobile');
      // N17-a (chủ dự án 25/10/2026): WebKit KHÔNG giảm chuyển động đo theo trạng thái CSS — vòng setTimeout + getComputedStyle,
      // không theo khung rAF của WebKit headless (1 khung 175–266ms); ghi thêm lúc `.header-menu` nhận class `current`. Chromium giữ rAF.
      const cssMode = f.br === 'webkit' && rm === 'no-preference';
      const r = await p.evaluate(([sel, css]) => new Promise((done) => {
        const seen = sel.map(() => null); let cls = null;
        const tick = () => { const t = performance.now() - (window.__t0 ?? performance.now());
          if (cls == null && document.querySelector('.header-menu.current')) cls = Math.round(t);
          sel.forEach((s, i) => { if (seen[i] == null && window.__vis(document.querySelector(s))) seen[i] = Math.round(t); });
          if (seen.every((x) => x != null) || t > 5000) done([...seen, cls]); else if (css) setTimeout(tick, 5); else requestAnimationFrame(tick); };
        tick(); }), [SEL, cssMode]);
      const how = cssMode ? 'setTimeout+getComputedStyle' : 'rAF';
      ok(r[0] != null && r[0] <= 400, `(1) [${rm}, ${how}] cây danh mục nhìn thấy sau ${r[0] ?? '> 5000'}ms (≤ 400; class current ${r[2]}ms)`);
      ok(r[1] != null && r[1] <= 400, `(1) [${rm}, ${how}] #nav nhìn thấy sau ${r[1] ?? '> 5000'}ms (≤ 400)`);
      summary.push(`${f.br}-${f.name} ${rm} (${how}): cây ${r[0] ?? '>5000'}ms · #nav ${r[1] ?? '>5000'}ms · class current ${r[2]}ms`);
      await p.waitForTimeout(500);
      if (rm === 'reduce') await p.screenshot({ path: path.join(EVD, `after-${f.br}-${f.name}.png`) });
      await p.keyboard.press('Escape'); await p.waitForTimeout(700);
      const closed = await p.evaluate((s) => !window.__vis(document.querySelector(s)), SEL[1]);
      const foc = await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
      ok(closed && foc === 'btn-menu-mobile', `(2) [${rm}] Escape đóng drawer=${closed}, focus=${foc}`);
    } else {
      const v = await p.evaluate((s) => window.__vis(document.querySelector(s)), SEL[1]);
      console.log(`  · [${rm}] desktop: #nav > li > a nhìn thấy = ${v}`);
      if (rm === 'reduce') await p.screenshot({ path: path.join(EVD, `after-${f.br}-${f.name}.png`) });
    }
    if (rm === 'reduce') {
      await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(1500);
      const now = await swiperSeq(p);
      await p.goto(BASE + '/', { waitUntil: 'load' }); await p.waitForTimeout(1500);
      await p.addStyleTag({ content: OLD_RULE });
      const old = await swiperSeq(p);
      console.log('  · Swiper (0s):   ' + now.join(' | '));
      console.log('  · Swiper (.01ms): ' + old.join(' | '));
      ok(now.length > 0 && JSON.stringify(now) === JSON.stringify(old), `(3) [${rm}] Swiper ${now.length} slider: chuỗi chỉ số giống đối chứng .01ms`);
    }
    ok(errs.length === 0, `(4) [${rm}] lỗi JS = ${errs.length}${errs.length ? ' — ' + errs.slice(0, 2).join(' / ') : ''}`);
    await ctx.close();
  }
  await b.close();
}
console.log('\nTÓM TẮT:\n' + summary.join('\n'));
console.log(fail ? `\nN17: CHƯA ĐẠT — ${fail} mục ✗` : '\nN17: ĐẠT');
process.exit(fail ? 1 : 0);
