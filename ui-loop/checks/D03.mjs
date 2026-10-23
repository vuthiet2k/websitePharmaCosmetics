#!/usr/bin/env node
/*
  ui-loop/checks/D03.mjs — kiểm việc D03 (nạp assets/pc-ui.css trong layouts/theme.bwt SAU CSS cũ) trên trình duyệt thật.
  Chạy:  node ui-loop/checks/D03.mjs before   (TRƯỚC khi nạp: ghi số đo + ảnh before-*)
         node ui-loop/checks/D03.mjs after    (SAU khi nạp: ghi số đo + ảnh after-*, so với before.json)
  "after" đạt khi ở mọi trang × khung: request pc-ui.css HTTP 200; có đúng 1 <link> pc-ui.css trong <head>, đứng SAU mọi
  <link rel=stylesheet> CSS cũ trong <head> (CSS cũ nạp giữa <body> bởi snippet/template — ajaxcart, footer_script, bpr…
  — chỉ in ra, không có selector .pc-*); styleSheet đã nạp (cssRules > 0). Ngoài ra in số phần tử có computed style đổi
  (màu, cỡ chữ, gạch chân, display, viền, kích thước) + chiều cao trang trước/sau để báo cáo thay đổi giao diện (không phải
  tiêu chí đạt — B.6: trùng tên class thì thang mới thắng là có chủ đích; hồi quy thật bắt bằng ui-verify --quick).
  Tab 5 lần ở mỗi trang: in viền focus (outline) của phần tử đang focus. (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'D03');
const BASE = 'http://localhost:3000';
const PHASE = process.argv[2] === 'before' ? 'before' : 'after';
fs.mkdirSync(EVD, { recursive: true });
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

const PAGES = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/dat-lich-tu-van', '/?tpl=login'];
const CONFIGS = [
  { b: 'chromium', k: '390', ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } },
  { b: 'webkit', k: '390', ctx: { ...devices['iPhone 13'] } },
  { b: 'chromium', k: '320', ctx: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true } },
  { b: 'chromium', k: '768', ctx: { viewport: { width: 768, height: 1024 } } },
  { b: 'chromium', k: '1024', ctx: { viewport: { width: 1024, height: 768 } } },
  { b: 'chromium', k: '1440', ctx: { viewport: { width: 1440, height: 900 } } },
  { b: 'chromium', k: '844x390', ctx: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];
const slug = (u) => (u === '/' ? 'home' : u.replace(/^\/\?tpl=/, 'tpl-').replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, ''));
const PROPS = ['display', 'color', 'fontSize', 'textDecorationLine', 'borderTopStyle', 'borderTopWidth', 'backgroundColor'];

const out = {};
for (const c of CONFIGS) {
  const browser = await (c.b === 'webkit' ? webkit : chromium).launch();
  for (const url of PAGES) {
    const ctx = await browser.newContext({ ...c.ctx, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    let pcStatus = null;
    page.on('response', (r) => { if (/\/pc-ui\.css(\?|$)/.test(r.url())) pcStatus = r.status(); });
    try { await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 45000 }); } catch { /* kết nối kéo dài — đo sau load */ }
    await page.waitForTimeout(800);
    const m = await page.evaluate((PROPS) => {
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => ({ href: l.getAttribute('href') || '', inHead: !!l.closest('head') }));
      const pcIdx = links.findIndex((l) => /pc-ui\.css/.test(l.href));
      const sameOrigin = links.map((l, i) => ({ ...l, i })).filter((l) => !/^(https?:)?\/\//.test(l.href) || l.href.includes(location.host));
      const after = pcIdx >= 0 ? sameOrigin.filter((l) => l.i > pcIdx && l.inHead && !/pc-ui\.css/.test(l.href)).map((l) => l.href) : [];
      const bodyCss = sameOrigin.filter((l) => !l.inHead).map((l) => l.href.replace(/^.*\//, ''));
      const sheet = [...document.styleSheets].find((s) => s.href && /pc-ui\.css/.test(s.href));
      let rules = 0; try { rules = sheet ? sheet.cssRules.length : 0; } catch { rules = -1; }
      const els = [...document.body.querySelectorAll('*')].map((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
        return [Math.round(r.width), Math.round(r.height), ...PROPS.map((p) => cs[p])].join('|'); });
      const ids = [...document.body.querySelectorAll('*')].map((e) => e.tagName.toLowerCase()
        + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
      return { docH: document.documentElement.scrollHeight, pcCount: links.filter((l) => /pc-ui\.css/.test(l.href)).length,
        pcInHead: pcIdx >= 0 && links[pcIdx].inHead, oldAfter: after, bodyCss, rules, els, ids, sw: document.documentElement.scrollWidth };
    }, PROPS);
    // Tab 5 lần: viền focus
    const rings = [];
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab');
      rings.push(await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return '-';
        const cs = getComputedStyle(a); return `${a.tagName.toLowerCase()}:${cs.outlineStyle} ${cs.outlineWidth}`; })); }
    out[`${c.b}-${c.k}|${url}`] = { ...m, pcStatus, rings };
    await page.screenshot({ path: path.join(EVD, `${PHASE}-${c.b}-${c.k}-${slug(url)}.png`) });
    await ctx.close();
  }
  await browser.close();
}
fs.writeFileSync(path.join(EVD, `${PHASE}.json`), JSON.stringify(out));

if (PHASE === 'before') {
  for (const [k, m] of Object.entries(out)) console.log(`  ${k} — docH ${m.docH}px · pc-ui.css link ${m.pcCount} · ${m.els.length} phần tử`);
  console.log(`[D03] Đã ghi ${Object.keys(out).length} lượt đo + ảnh before-* vào ui-loop/evidence/D03/`);
} else {
  const before = JSON.parse(fs.readFileSync(path.join(EVD, 'before.json'), 'utf8'));
  let changedTotal = 0;
  for (const [k, a] of Object.entries(out)) {
    const b = before[k] || { els: [], docH: 0 };
    let changed = 0;
    const samples = [];
    if (a.els.length === b.els.length) a.els.forEach((s, i) => { if (s !== b.els[i]) { changed++; if (samples.length < 8) {
      const x = b.els[i].split('|'), y = s.split('|'); const d = y.map((v, j) => (v !== x[j] ? (['w', 'h', ...PROPS][j] + ' ' + x[j] + '→' + v) : null)).filter(Boolean);
      samples.push(a.ids[i] + ' {' + d.join('; ') + '}'); } } }); else changed = -1;
    changedTotal += Math.max(changed, 0);
    ok(a.pcStatus === 200 && a.pcCount === 1 && a.pcInHead && a.oldAfter.length === 0 && a.rules > 0,
      `${k} — pc-ui.css HTTP ${a.pcStatus} · link ${a.pcCount} trong head ${a.pcInHead} · CSS cũ trong head nạp sau: ${a.oldAfter.length}${a.oldAfter.length ? ' (' + a.oldAfter.join(', ') + ')' : ''} · cssRules ${a.rules}`
      + ` · CSS trong body: ${a.bodyCss.join(', ') || '-'} | docH ${b.docH}→${a.docH}px · scrollW ${a.sw} · phần tử đổi style ${changed}/${a.els.length} · focus ${a.rings.join(', ')}`);
    if (samples.length) console.log('      đổi: ' + samples.join(' · '));
  }
  console.log(`[D03] Tổng phần tử có computed style/kích thước đổi: ${changedTotal}`);
  console.log(fail ? `[D03] CHƯA ĐẠT (${fail} mục)` : '[D03] ĐẠT');
  process.exit(fail ? 1 : 0);
}
