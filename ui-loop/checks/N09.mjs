#!/usr/bin/env node
/*
  ui-loop/checks/N09.mjs — kiểm việc N09 (CSS cũ `label { display: inline-block !important }` đè `.pc-check`) trên trình duyệt thật.
  Trang kit /?tpl=page.ui-kit, 7 khung: Chromium 390 / 320 / 768 / 1024 / 1440 / ngang 844×390 + WebKit iPhone 13.
  Đo: computed display `label.pc-check` (flex/inline-flex), khoảng ô → chữ (cạnh phải ô bấm tới cạnh trái chữ, cần 12px = gap-3),
  lệch tâm dọc ô bấm / ô vẽ ::before và chữ (≤ 1px); bấm chữ, Tab + Space vẫn đổi trạng thái.
  Ảnh: ui-loop/evidence/N09/after-<khung>.png (màn hình, nhãn giữa màn) + after-<khung>-zoom.png (cận vùng nhãn).
  Hồi quy: mọi label + input[type=checkbox] ngoài .pc-check trên Q + /account/register + /about-us × Chromium 390/1440 + WebKit 390 —
    node ui-loop/checks/N09.mjs --before   (chạy trên bản chưa sửa, ghi evidence/N09/before.json)
    node ui-loop/checks/N09.mjs            (so với before.json)
  Cần npm run preview ở localhost:3000.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N09');
const BASE = 'http://localhost:3000';
const BEFORE = process.argv.includes('--before');
fs.mkdirSync(EVD, { recursive: true });
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };
const r1 = (v) => Math.round(v * 10) / 10;

const REG_PAGES = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/dat-lich-tu-van', '/?tpl=login', '/account/register', '/about-us'];
const REG_FRAMES = [
  { name: 'chromium-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'chromium-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'webkit-390', engine: webkit, opts: { ...devices['iPhone 13'] } },
];
const KIT_FRAMES = [
  REG_FRAMES[0], REG_FRAMES[2],
  { name: 'chromium-320', engine: chromium, opts: { viewport: { width: 320, height: 568 } } },
  { name: 'chromium-768', engine: chromium, opts: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', engine: chromium, opts: { viewport: { width: 1024, height: 768 } } },
  REG_FRAMES[1],
  { name: 'chromium-844x390', engine: chromium, opts: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];
const browsers = {};
const open = async (f, url) => {
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext(f.opts); const page = await ctx.newPage();
  const res = await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  return { ctx, page, status: res.status() };
};

// Hồi quy: label + checkbox ngoài thư viện — display, margin, cỡ (không lấy toạ độ: slider/app chèn JS làm lệch vị trí giữa các lần nạp)
const regSnap = (page) => page.evaluate(() => [...document.querySelectorAll('label, input[type=checkbox]')]
  .filter((e) => !e.closest('.pc-check'))
  .map((e, i) => {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { k: `${i}:${e.tagName}:${e.htmlFor || e.id || e.name || e.className}`.slice(0, 80), display: cs.display, mb: cs.marginBottom,
      size: [r.width, r.height].map((v) => Math.round(v)).join('×') };
  }));

const regResult = {};
for (const f of REG_FRAMES) for (const u of REG_PAGES) {
  const { ctx, page, status } = await open(f, u);
  regResult[`${f.name} ${u}`] = { status, items: await regSnap(page) };
  await ctx.close();
}
if (BEFORE) {
  fs.writeFileSync(path.join(EVD, 'before.json'), JSON.stringify(regResult, null, 1));
  const n = Object.values(regResult).reduce((s, v) => s + v.items.length, 0);
  console.log(`[N09] đã ghi before.json: ${Object.keys(regResult).length} lượt, ${n} label/checkbox ngoài .pc-check`);
  for (const b of Object.values(browsers)) await b.close();
  process.exit(0);
}

console.log('\n[N09] hồi quy label/checkbox ngoài thư viện (so before.json)');
const before = JSON.parse(fs.readFileSync(path.join(EVD, 'before.json'), 'utf8'));
let regN = 0; let dispDiff = 0; const regDiff = [];
for (const [k, v] of Object.entries(regResult)) {
  regN += v.items.length;
  const a = before[k]?.items || [];
  if (a.length !== v.items.length) { regDiff.push(`${k}: số phần tử ${a.length} → ${v.items.length}`); continue; }
  v.items.forEach((it, i) => {
    const o = a[i];
    if (o.k !== it.k || o.display !== it.display || o.mb !== it.mb) { dispDiff++; regDiff.push(`${k} ${it.k}: ${o.display}/${o.mb} → ${it.display}/${it.mb}`); }
    else if (o.size !== it.size) regDiff.push(`${k} ${it.k}: cỡ ${o.size} → ${it.size}`);
  });
}
ok(regDiff.length === 0, `${Object.keys(regResult).length} lượt, ${regN} label/checkbox ngoài .pc-check: ${dispDiff} đổi display/margin, ${regDiff.length} khác biệt${regDiff.length ? ' — ' + regDiff.slice(0, 5).join(' ; ') : ''}`);

const summary = [];
for (const f of KIT_FRAMES) {
  console.log(`\n[N09] ${f.name} /?tpl=page.ui-kit`);
  const { ctx, page, status } = await open(f, '/?tpl=page.ui-kit');
  ok(status === 200, `HTTP ${status}`);
  const m = await page.evaluate(() => {
    const lab = document.querySelector('label.pc-check'); lab.scrollIntoView({ block: 'center' });
    const inp = lab.querySelector('input'); const sp = lab.querySelector('span');
    const cs = getComputedStyle(lab); const b = inp.getBoundingClientRect(); const t = sp.getBoundingClientRect(); const lr = lab.getBoundingClientRect();
    const bf = getComputedStyle(inp, '::before'); const bw = parseFloat(bf.width); const bh = parseFloat(bf.height);
    // ô vẽ ::before đặt giữa ô bấm (inline-grid place-content-center)
    const drawnCy = b.top + b.height / 2;
    const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return { display: cs.display, gapCss: cs.columnGap, align: cs.alignItems, vw: innerWidth,
      box: [b.width, b.height], drawn: [bw, bh], label: [lr.width, lr.height],
      gap: t.left - b.right, drawnGap: t.left - (b.left + b.width / 2 + bw / 2),
      dy: (t.top + t.height / 2) - (b.top + b.height / 2), dyDrawn: (t.top + t.height / 2) - drawnCy,
      textTop: t.top, boxTop: b.top, hitSelf: hit === inp };
  });
  ok(m.display === 'flex' || m.display === 'inline-flex', `label.pc-check display ${m.display}, column-gap ${m.gapCss}, align-items ${m.align}; nhãn ${r1(m.label[0])}×${r1(m.label[1])}px`);
  ok(Math.abs(m.gap - 12) <= 0.5, `ô bấm ${r1(m.box[0])}×${r1(m.box[1])} → chữ cách ${r1(m.gap)}px (cần 12); ô vẽ ${m.drawn[0]}×${m.drawn[1]} → chữ ${r1(m.drawnGap)}px`);
  ok(Math.abs(m.dy) <= 1, `lệch tâm dọc ô ↔ chữ ${r1(m.dy)}px (ô vẽ ↔ chữ ${r1(m.dyDrawn)}px; cần ≤ 1)`);
  ok(m.hitSelf, `tâm ô trúng chính ô (elementFromPoint): ${m.hitSelf}`);

  const box = page.locator('.pc-check input[type=checkbox]');
  const s0 = await box.isChecked();
  await page.locator('.pc-check span').click(); const s1 = await box.isChecked();
  await box.click(); const s2 = await box.isChecked();
  ok(s1 !== s0 && s2 !== s1, `bấm chữ nhãn: ${s0} → ${s1}; bấm ô: ${s1} → ${s2}`);
  await page.evaluate(() => {
    const all = [...document.querySelectorAll('a[href],button,input,textarea,select')].filter((e) => !e.disabled && e.getBoundingClientRect().height > 0);
    const i = all.indexOf(document.querySelector('.pc-check input')); all[i - 1].focus();
  });
  await page.keyboard.press('Tab');
  const fr = await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { isBox: a.matches('.pc-check input'), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) }; });
  const s3 = await box.isChecked(); await page.keyboard.press('Space'); const s4 = await box.isChecked();
  ok(fr.isBox && fr.style === 'solid' && fr.width >= 2 && s4 !== s3, `Tab tới ô: ${fr.isBox}, viền ${fr.style} ${fr.width}px; Space ${s3} → ${s4}`);
  await page.keyboard.press('Shift+Tab');
  const back = await page.evaluate(() => !document.activeElement.matches('.pc-check input'));
  ok(back, `Shift+Tab rời ô: ${back}`);
  await page.evaluate(() => document.activeElement.blur());

  if (!(await box.isChecked())) await box.check();
  await page.evaluate(() => document.querySelector('label.pc-check').scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: path.join(EVD, `after-${f.name}.png`) });
  const lb = await page.locator('label.pc-check').boundingBox();
  const vw = page.viewportSize().width;
  const clip = { x: Math.max(0, lb.x - 16), y: Math.max(0, lb.y - 16), width: Math.min(vw - Math.max(0, lb.x - 16), lb.width + 32), height: lb.height + 32 };
  await page.screenshot({ path: path.join(EVD, `after-${f.name}-zoom.png`), clip });
  summary.push({ frame: f.name, ...m, toggle: [s0, s1, s2], focus: fr, space: [s3, s4] });
  await ctx.close();
}
for (const b of Object.values(browsers)) await b.close();
fs.writeFileSync(path.join(EVD, 'result.json'), JSON.stringify({ regression: { runs: Object.keys(regResult).length, items: regN, diff: regDiff }, kit: summary }, null, 1));
console.log(`\n[N09] ${fail ? 'CHƯA ĐẠT — ' + fail + ' mục' : 'ĐẠT'}`);
process.exit(fail ? 1 : 0);
