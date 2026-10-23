#!/usr/bin/env node
/*
  ui-loop/checks/N06.mjs — kiểm việc N06 (checkbox của ui_field bị CSS cũ ẩn) trên trình duyệt thật.
  Trang kit /?tpl=page.ui-kit, 7 khung: Chromium 390 / 320 / 768 / 1024 / 1440 / ngang 844×390 + WebKit iPhone 13.
  Đo: computed opacity / position / cỡ ô `.pc-check input`; ô nằm trong khung nhãn; bấm ô + bấm chữ nhãn đổi trạng thái;
  Tab tới ô có viền focus; Space đổi trạng thái. Ảnh: ui-loop/evidence/N06/after-<khung>.png (+ ảnh cận vùng ô).
  Hồi quy: mọi input[type=checkbox] ngoài .pc-check trên 8 trang × Chromium 390/1440 + WebKit 390 —
    node ui-loop/checks/N06.mjs --before   (chạy trên bản chưa sửa, ghi evidence/N06/before.json)
    node ui-loop/checks/N06.mjs            (so với before.json)
  Cần npm run preview ở localhost:3000.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N06');
const BASE = 'http://localhost:3000';
const BEFORE = process.argv.includes('--before');
fs.mkdirSync(EVD, { recursive: true });
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

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

// Hồi quy: checkbox ngoài thư viện (đo ở đầu trang, không cuộn)
const regSnap = (page) => page.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')]
  .filter((e) => !e.closest('.pc-check'))
  .map((e, i) => {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { k: `${i}:${e.id || e.name || e.className}`, opacity: cs.opacity, position: cs.position, display: cs.display,
      outline: cs.outlineStyle, rect: [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10).join(',') };
  }));

const regResult = {};
for (const f of REG_FRAMES) for (const u of REG_PAGES) {
  const { ctx, page, status } = await open(f, u);
  regResult[`${f.name} ${u}`] = { status, boxes: await regSnap(page) };
  await ctx.close();
}
if (BEFORE) {
  fs.writeFileSync(path.join(EVD, 'before.json'), JSON.stringify(regResult, null, 1));
  const n = Object.values(regResult).reduce((s, v) => s + v.boxes.length, 0);
  console.log(`[N06] đã ghi before.json: ${Object.keys(regResult).length} lượt, ${n} checkbox ngoài .pc-check`);
  for (const b of Object.values(browsers)) await b.close();
  process.exit(0);
}

console.log('\n[N06] hồi quy checkbox ngoài thư viện (so before.json)');
const before = JSON.parse(fs.readFileSync(path.join(EVD, 'before.json'), 'utf8'));
let regN = 0; const regDiff = [];
for (const [k, v] of Object.entries(regResult)) {
  const a = JSON.stringify(before[k]?.boxes); const bb = JSON.stringify(v.boxes); regN += v.boxes.length;
  if (a !== bb) regDiff.push(`${k}: ${a} → ${bb}`);
}
ok(regDiff.length === 0, `${Object.keys(regResult).length} lượt, ${regN} checkbox ngoài .pc-check: ${regDiff.length} lượt đổi${regDiff.length ? ' — ' + regDiff.slice(0, 3).join(' ; ') : ''}`);

const summary = [];
for (const f of KIT_FRAMES) {
  console.log(`\n[N06] ${f.name} /?tpl=page.ui-kit`);
  const { ctx, page, status } = await open(f, '/?tpl=page.ui-kit');
  ok(status === 200, `HTTP ${status}`);
  await page.locator('label.pc-check').scrollIntoViewIfNeeded();
  const m = await page.evaluate(() => {
    const inp = document.querySelector('.pc-check input[type=checkbox]'); const lab = inp.closest('.pc-check');
    const cs = getComputedStyle(inp); const r = inp.getBoundingClientRect(); const lr = lab.getBoundingClientRect();
    const cx = r.x + r.width / 2; const cy = r.y + r.height / 2; const hit = document.elementFromPoint(cx, cy);
    return { opacity: cs.opacity, position: cs.position, display: cs.display, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
      labelH: Math.round(lr.height * 10) / 10, inside: r.left >= lr.left && r.right <= lr.right && r.top >= lr.top && r.bottom <= lr.bottom,
      hitSelf: hit === inp, accent: cs.accentColor, cls: inp.className };
  });
  ok(m.opacity === '1' && m.position === 'static', `ô: opacity ${m.opacity}, position ${m.position}, display ${m.display}, class "${m.cls}", accent ${m.accent}`);
  ok(m.w === 24 && m.h === 24, `cỡ ô ${m.w}×${m.h}px (cần 24×24)`);
  ok(m.inside && m.labelH >= 44, `ô nằm trong nhãn: ${m.inside}; nhãn cao ${m.labelH}px`);
  ok(m.hitSelf, `tâm ô trúng chính ô (elementFromPoint): ${m.hitSelf}`);

  const box = page.locator('.pc-check input[type=checkbox]');
  const s0 = await box.isChecked();
  await box.click(); const s1 = await box.isChecked();
  await page.locator('.pc-check span').click(); const s2 = await box.isChecked();
  ok(s1 !== s0 && s2 !== s1, `bấm ô: ${s0} → ${s1}; bấm chữ nhãn: ${s1} → ${s2}`);

  // Tab tới ô: focus phần tử ngay trước rồi Tab
  await page.evaluate(() => {
    const all = [...document.querySelectorAll('a[href],button,input,textarea,select')].filter((e) => !e.disabled && e.getBoundingClientRect().height > 0);
    const i = all.indexOf(document.querySelector('.pc-check input')); all[i - 1].focus();
  });
  await page.keyboard.press('Tab');
  const fr = await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { isBox: a.matches('.pc-check input'), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: cs.outlineColor }; });
  ok(fr.isBox && fr.style === 'solid' && fr.width >= 2 && fr.color === 'rgb(7, 91, 64)', `Tab tới ô: ${fr.isBox}; viền ${fr.style} ${fr.width}px ${fr.color}`);
  const s3 = await box.isChecked(); await page.keyboard.press('Space'); const s4 = await box.isChecked();
  ok(s4 !== s3, `Space: ${s3} → ${s4}`);
  await page.evaluate(() => document.activeElement.blur());

  // Ảnh: cả trang + cận vùng ô (đang tích)
  if (!(await box.isChecked())) await box.check();
  await page.screenshot({ path: path.join(EVD, `after-${f.name}.png`), fullPage: true });
  // Ảnh màn hình với nhãn ở giữa màn (ảnh cận phần tử bị toast / header cố định che ở khung nhỏ)
  const gap = await page.evaluate(() => {
    const lab = document.querySelector('label.pc-check'); lab.scrollIntoView({ block: 'center' });
    const b = lab.querySelector('input').getBoundingClientRect(); const t = lab.querySelector('span').getBoundingClientRect();
    const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return { gap: Math.round((t.left - b.right) * 10) / 10, boxTop: Math.round(b.top), hitSelf: hit === lab.querySelector('input') };
  });
  ok(gap.hitSelf, `nhãn giữa màn: ô top ${gap.boxTop}px không bị che (${gap.hitSelf}); ô → chữ cách ${gap.gap}px`);
  await page.screenshot({ path: path.join(EVD, `after-${f.name}-field.png`) });
  summary.push({ frame: f.name, ...m, toggle: [s0, s1, s2], focus: fr, space: [s3, s4], gap: gap.gap });
  await ctx.close();
}
for (const b of Object.values(browsers)) await b.close();
fs.writeFileSync(path.join(EVD, 'result.json'), JSON.stringify({ regression: { runs: Object.keys(regResult).length, boxes: regN, diff: regDiff }, kit: summary }, null, 1));
console.log(`\n[N06] ${fail ? 'CHƯA ĐẠT — ' + fail + ' mục' : 'ĐẠT'}`);
process.exit(fail ? 1 : 0);
