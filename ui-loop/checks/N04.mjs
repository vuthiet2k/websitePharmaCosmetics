#!/usr/bin/env node
/*
  ui-loop/checks/N04.mjs — kiểm việc N04: viền focus của phần tử thư viện pc-* không bị CSS cũ tắt.
  Trang kit /?tpl=page.ui-kit ở 1440 + 390 (Chromium, WebKit iPhone 13) + 320 / 768 / 1024 / ngang 844×390 (Chromium):
    Tab từ đầu khối nút đi hết #pc-kit, rồi Shift+Tab ngược lại; mở popup (bấm nút mở + bỏ hidden — JS là D05) và Tab vào
    nút đóng; đo outline-style / outline-width / outline-color của từng phần tử đang focus.
    Đạt: button.pc-btn, a.pc-btn, .pc-swiper-btn, .pc-modal__close, .pc-input, .pc-fab: outline solid ≥ 2px màu brand rgb(7, 91, 64).
  Hồi quy (phần tử KHÔNG thuộc pc-*): Tab 40 lần trên 6 trang Q ở 1440 + 390 Chromium, so outline/box-shadow từng phần tử đang
    focus với lần chạy `--before` (trước sửa) — 0 phần tử đổi.
  Chạy: node ui-loop/checks/N04.mjs [--before]   (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N04');
const BASE = 'http://localhost:3000';
const BEFORE = process.argv.includes('--before');
const tag = BEFORE ? 'before' : 'after';
fs.mkdirSync(EVD, { recursive: true });
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };
const BRAND = 'rgb(7, 91, 64)';

const FRAMES = [
  { name: 'chromium-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'chromium-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'webkit-1440', engine: webkit, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'webkit-390', engine: webkit, opts: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', engine: chromium, opts: { viewport: { width: 320, height: 568 } } },
  { name: 'chromium-768', engine: chromium, opts: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', engine: chromium, opts: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-844x390', engine: chromium, opts: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];
const Q = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/dat-lich-tu-van', '/?tpl=login'];

// Mô tả phần tử đang focus + viền focus đo được
const focusInfo = () => {
  const a = document.activeElement;
  if (!a || a === document.body) return null;
  const cs = getComputedStyle(a); const r = a.getBoundingClientRect();
  const path = []; for (let e = a; e && e !== document.body && path.length < 4; e = e.parentElement) path.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : ''));
  return { key: path.join('>') + ' "' + (a.getAttribute('aria-label') || a.textContent || a.name || '').trim().replace(/\s+/g, ' ').slice(0, 30) + '"',
    pc: [...a.classList].some((c) => c.startsWith('pc-')), inKit: !!a.closest('#pc-kit'),
    style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: cs.outlineColor, offset: cs.outlineOffset, shadow: cs.boxShadow,
    w: Math.round(r.width), h: Math.round(r.height) };
};
const LIB = /\.(pc-btn|pc-swiper-btn|pc-modal__close|pc-input|pc-fab)\b/;
const isLib = (f) => f && LIB.test(f.key.split('>').pop());
const ringOk = (f) => f.style === 'solid' && f.width >= 2 && f.color === BRAND;
const fmt = (f) => `${f.key} → ${f.style} ${f.width}px ${f.color}`;

const browsers = {}; const summary = [];
const open = async (f, url) => {
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext(f.opts); const page = await ctx.newPage();
  const res = await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  return { ctx, page, status: res.status() };
};
// WebKit (Safari) mặc định Tab bỏ qua nút/link — Alt+Tab là phím tương đương "Option+Tab" của Safari
const TAB = (f) => (f.engine === webkit ? 'Alt+Tab' : 'Tab');

// 1) Trang kit (chạy cả trước sửa để có số đo đối chiếu; trước sửa không tính đạt/chưa đạt)
for (const f of FRAMES) {
  console.log(`\n[N04] kit ${f.name}`);
  const { ctx, page, status } = await open(f, '/?tpl=page.ui-kit');
  ok(status === 200, `HTTP ${status}`);
  await page.click('[data-kit="ui_button"] h2');
  const seen = []; let shot = false;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press(TAB(f));
    const fi = await page.evaluate(focusInfo);
    if (!fi || !fi.inKit) { if (fi && !fi.inKit && seen.length) break; continue; }
    seen.push(fi);
    if (!shot && /button\.pc-btn/.test(fi.key.split('>').pop())) {
      // chụp kèm lề 12px — outline nằm ngoài khung phần tử (offset 2px)
      const r = await page.evaluate(() => { const b = document.activeElement.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
      await page.screenshot({ path: path.join(EVD, `${tag}-${f.name}-focus-btn.png`), clip: { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 12), width: r.w + 24, height: r.h + 24 } }).catch(() => {});
      shot = true;
    }
  }
  const lib = seen.filter(isLib);
  const bad = lib.filter((x) => !ringOk(x));
  const kinds = [...new Set(lib.map((x) => (x.key.split('>').pop().match(LIB) || [])[1]))];
  ok(lib.length >= 6 && bad.length === 0, `Tab: ${seen.length} phần tử trong #pc-kit, ${lib.length} phần tử thư viện (${kinds.join(', ')}), sai viền ${bad.length}${bad.length ? ': ' + bad.slice(0, 3).map(fmt).join(' | ') : ''}`);
  ok(['pc-btn', 'pc-swiper-btn', 'pc-input'].every((k) => kinds.includes(k)), `Tab đi qua đủ button/a .pc-btn, .pc-swiper-btn, .pc-input`);
  const btnTag = lib.filter((x) => /^button\.pc-btn/.test(x.key.split('>').pop()));
  if (btnTag[0]) console.log(`  · ví dụ ${fmt(btnTag[0])} offset ${btnTag[0].offset}`);
  // Shift+Tab ngược 5 lần
  const back = [];
  for (let i = 0; i < 5; i++) { await page.keyboard.press('Shift+' + TAB(f)); const fi = await page.evaluate(focusInfo); if (fi && isLib(fi)) back.push(fi); }
  ok(back.length > 0 && back.every(ringOk), `Shift+Tab: ${back.length} phần tử thư viện, viền đúng ${back.filter(ringOk).length}`);
  // Ô nhập: bấm chuột vào ô (focus-visible luôn bật với ô nhập)
  await page.locator('#pc-kit input.pc-input').first().click();
  const inp = await page.evaluate(focusInfo);
  ok(inp && ringOk(inp), `bấm vào ô nhập: ${inp ? fmt(inp) : 'không focus'}`);
  await page.locator('[data-kit="ui_field"]').screenshot({ path: path.join(EVD, `${tag}-${f.name}-focus-input.png`) });
  // Popup: bấm nút mở, bỏ hidden (D05), focus nút đóng bằng Tab
  await page.click('[data-pc-modal-open="kit-modal"]');
  await page.evaluate(() => { document.getElementById('kit-modal').hidden = false; document.querySelector('[data-pc-modal-overlay="kit-modal"]').hidden = false; });
  await page.locator('#kit-modal .pc-modal__title, #kit-modal h2').first().click().catch(() => {});
  let close = null;
  for (let i = 0; i < 8 && !close; i++) { await page.keyboard.press('Shift+' + TAB(f)); const fi = await page.evaluate(focusInfo); if (fi && /pc-modal__close/.test(fi.key)) close = fi; }
  for (let i = 0; i < 8 && !close; i++) { await page.keyboard.press(TAB(f)); const fi = await page.evaluate(focusInfo); if (fi && /pc-modal__close/.test(fi.key)) close = fi; }
  ok(close && ringOk(close), `nút đóng popup: ${close ? fmt(close) : 'không Tab tới được'}`);
  await page.screenshot({ path: path.join(EVD, `${tag}-${f.name}-modal.png`) });
  summary.push({ frame: f.name, tabbed: seen.length, lib: lib.length, kinds, bad: bad.map(fmt), back: back.length, input: inp && fmt(inp), close: close && fmt(close), sample: btnTag[0] && fmt(btnTag[0]) });
  await ctx.close();
}

// 2) Hồi quy phần tử ngoài thư viện trên 6 trang Q
const legacy = {};
for (const f of FRAMES.filter((x) => x.name === 'chromium-1440' || x.name === 'chromium-390')) {
  for (const url of Q) {
    const { ctx, page } = await open(f, url);
    const list = [];
    for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); const fi = await page.evaluate(focusInfo); if (fi && !fi.pc) list.push(fi); }
    legacy[`${f.name} ${url}`] = list;
    await ctx.close();
  }
}
const bfile = path.join(EVD, 'legacy-before.json');
if (BEFORE) {
  fs.writeFileSync(bfile, JSON.stringify(legacy, null, 1));
  const n = Object.values(legacy).reduce((s, l) => s + l.length, 0);
  console.log(`\n[N04] đã ghi ${n} lượt focus phần tử ngoài pc-* (${Object.keys(legacy).length} trang×khung) → ${path.relative(ROOT, bfile)}`);
} else {
  const before = JSON.parse(fs.readFileSync(bfile, 'utf8'));
  let total = 0; const diff = [];
  for (const [k, list] of Object.entries(legacy)) {
    // Ghép theo phần tử (key), không theo thứ tự: iframe bản đồ tải xong hay chưa làm thêm/bớt 1 điểm Tab
    const pool = [...(before[k] || [])];
    list.forEach((x, i) => { total++;
      const j = pool.findIndex((y) => y.key === x.key); const y = j >= 0 ? pool.splice(j, 1)[0] : null;
      // outline-style none ⇒ độ dày / màu không hiển thị (màu = currentColor, có thể đang chuyển tiếp) — không so
      const vis = (o) => o.style !== 'none';
      if (!y) { if (!/>iframe /.test(x.key)) diff.push(`${k} #${i}: chỉ có sau sửa ⇒ ${fmt(x)}`); else console.log(`    (bỏ qua iframe: ${k} ${x.key})`); return; }
      if (y.style !== x.style || y.shadow !== x.shadow || (vis(x) && (y.width !== x.width || y.color !== x.color))) diff.push(`${k} #${i}: ${fmt(y)}  ⇒  ${fmt(x)}`); });
    pool.filter((y) => !/>iframe /.test(y.key)).forEach((y) => diff.push(`${k}: chỉ có trước sửa ${fmt(y)}`));
  }
  console.log(`\n[N04] hồi quy ngoài pc-*`);
  ok(diff.length === 0, `${total} lượt focus phần tử ngoài pc-* trên 6 trang Q × 1440/390: đổi ${diff.length}`);
  diff.slice(0, 15).forEach((d) => console.log('    ' + d));
  fs.writeFileSync(path.join(EVD, 'result.json'), JSON.stringify({ kit: summary, legacyTotal: total, legacyDiff: diff }, null, 1));
}
for (const b of Object.values(browsers)) await b.close();
if (!BEFORE) console.log(`\n[N04] ${fail ? 'CHƯA ĐẠT — ' + fail + ' mục' : 'ĐẠT'}`);
process.exit(fail ? 1 : 0);
