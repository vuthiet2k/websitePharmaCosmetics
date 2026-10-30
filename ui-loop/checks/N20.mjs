// ui-loop/checks/N20.mjs — N20: 3 link trong đoạn văn /about-us (khối .pc-about-seo) phải gạch chân (D.4, axe link-in-text-block).
// Chạy: node ui-loop/checks/N20.mjs [tên]   (tên mặc định "after") — đo 7 khung Chromium + WebKit iPhone 13, chụp ảnh khối.
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = 'http://localhost:3000';
const EV = path.resolve('ui-loop/evidence/N20'); fs.mkdirSync(EV, { recursive: true });
const tag = process.argv[2] || 'after';
const VPS = [
  ['chromium', '390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ['chromium', '320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ['chromium', '768', { viewport: { width: 768, height: 1024 } }],
  ['chromium', '1024', { viewport: { width: 1024, height: 768 } }],
  ['chromium', '1440', { viewport: { width: 1440, height: 900 } }],
  ['chromium', '844x390', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ['webkit', 'iphone13', { ...devices['iPhone 13'] }],
];

function lum(rgb) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return +((x + 0.05) / (y + 0.05)).toFixed(2); };

let fail = 0;
const out = [];
for (const [bn, name, opts] of VPS) {
  const br = await (bn === 'webkit' ? webkit : chromium).launch();
  const ctx = await br.newContext({ ...opts, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const jsErr = []; page.on('pageerror', (e) => jsErr.push(e.message.slice(0, 120)));
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  await page.goto(BASE + '/about-us', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(800);
  const links = page.locator('.pc-about-seo p a');
  await links.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(255, 255, 255)'; };
    return [...document.querySelectorAll('.pc-about-seo p a')].map((a) => {
      const cs = getComputedStyle(a); const ps = getComputedStyle(a.parentElement); const r = a.getBoundingClientRect();
      return { href: a.getAttribute('href'), deco: cs.textDecorationLine, color: cs.color, pColor: ps.color, bg: bgOf(a), display: cs.display, lh: parseFloat(ps.lineHeight), h: Math.round(r.height), rects: a.getClientRects().length };
    });
  });
  // axe link-in-text-block trên cả trang
  await page.addScriptTag({ content: AXE_SRC });
  const axe = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'rule', values: ['link-in-text-block', 'color-contrast'] }, resultTypes: ['violations'] });
    return Object.fromEntries(['link-in-text-block', 'color-contrast'].map((id) => { const v = r.violations.find((x) => x.id === id); return [id, v ? v.nodes.map((n) => n.target.join(' ')) : []]; }));
  });
  // Tab tới từng link: focus đi tới bằng bàn phím từ phần tử ngay trước link đầu
  const focus = [];
  await page.evaluate(() => { const a = document.querySelector('.pc-about-seo p a'); const t = document.createElement('span'); t.tabIndex = 0; t.id = 'n20-start'; a.parentElement.insertBefore(t, a); t.focus(); });
  // WebKit giả lập iPhone 13: Tab / Alt+Tab / Meta+Tab đều KHÔNG đưa link vào thứ tự Tab (đo vòng 35: nhảy tới
  // button/select cuối trang) — hành vi engine, không do N20. Ở WebKit đo viền bằng: bấm Tab (đặt chế độ bàn phím)
  // rồi focus() từng link; thứ tự Tab / Shift+Tab chỉ đo ở Chromium.
  const readFocus = () => page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { href: e.getAttribute('href') || (e.tagName + '.' + String(e.className).slice(0, 40)), outline: cs.outlineStyle + ' ' + cs.outlineWidth, visible: e.matches(':focus-visible') }; });
  let back;
  if (bn === 'webkit') {
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); await links.nth(i).focus(); focus.push(await readFocus()); }
    back = focus[1].href;
  } else {
    for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); focus.push(await readFocus()); }
    await page.keyboard.press('Shift+Tab');
    back = await page.evaluate(() => document.activeElement.getAttribute('href'));
  }
  if (focus[2]) await page.locator('.pc-about-seo p a').nth(2).focus();
  await page.evaluate(() => document.getElementById('n20-start')?.remove());
  const shot = path.join(EV, `${tag}-${bn}-${name}.png`);
  await page.locator('.pc-about-seo').screenshot({ path: shot });
  await br.close();

  const errs = [];
  m.forEach((l) => {
    if (l.deco !== 'underline') errs.push(`${l.href} không gạch chân (${l.deco})`);
    const cr = ratio(l.color, l.bg); l.cr = cr; if (cr < 4.5) errs.push(`${l.href} tương phản ${cr}`);
    l.crText = ratio(l.color, l.pColor);
    if (l.display !== 'inline') errs.push(`${l.href} display ${l.display}`);
    if (l.h > 2 * l.lh * l.rects + 1) errs.push(`${l.href} cao ${l.h}px > 2× dòng`);
  });
  if (m.length !== 3) errs.push(`số link ${m.length} ≠ 3`);
  if (axe['link-in-text-block'].length) errs.push(`axe link-in-text-block ${axe['link-in-text-block'].length}`);
  focus.forEach((f, i) => { if (f.href !== m[i]?.href) errs.push(`Tab ${i + 1} tới ${f.href}`); if (!/solid|auto/.test(f.outline) || parseFloat(f.outline.split(' ')[1]) < 2) errs.push(`Tab ${f.href} viền ${f.outline}`); });
  if (back !== m[1]?.href) errs.push(`Shift+Tab tới ${back}`);
  if (jsErr.length) errs.push('lỗi JS: ' + jsErr.join(' | '));
  if (errs.length) fail++;
  const row = { bn, name, links: m.map((l) => `${l.href.slice(1)} ${l.deco} ${l.color} nền ${l.bg} ${l.cr}:1 (so chữ đoạn ${l.crText}:1) ${l.display} cao ${l.h}px/${l.rects} dòng lh ${l.lh}`), axeLink: axe['link-in-text-block'].length, axeContrast: axe['color-contrast'].length, focus: focus.map((f) => `${f.href} ${f.outline} fv=${f.visible}`), shiftTab: back, errs };
  out.push(row);
  console.log(`\n[${bn} ${name}] ${errs.length ? 'CHƯA ĐẠT' : 'ĐẠT'}`);
  row.links.forEach((s) => console.log('  ' + s));
  console.log(`  axe link-in-text-block ${row.axeLink} · color-contrast ${row.axeContrast}`);
  console.log('  Tab: ' + row.focus.join(' → ') + ' · Shift+Tab → ' + back);
  errs.forEach((e) => console.log('  ✗ ' + e));
}
fs.writeFileSync(path.join(EV, tag + '.json'), JSON.stringify({ when: new Date().toISOString(), out }, null, 1));
console.log(`\nKẾT QUẢ: ${VPS.length - fail}/${VPS.length} khung đạt`);
process.exit(fail ? 1 : 0);
