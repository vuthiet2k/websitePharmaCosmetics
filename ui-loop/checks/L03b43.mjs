// L03b43 (vòng 112, 09/11/2026 — chạy lại: node ui-loop/checks/L03b43.mjs before|after).
// Việc: trang test local /blogs/truoc-va-sau-1 (dev-preview/templates/blog.truoc-va-sau.bwt) — 49 icon Font Awesome → ui_icon size em.
// Đo mỗi icon theo vị trí (thanh dev, ô thiếu ảnh, danh sách kiểm): loại (FA glyph / SVG), hộp, tâm so với dòng chữ, màu;
//   cao từng dòng kiểm, cao trang, lỗi JS, PC-ERROR, phần tử class fa-*, glyph font FA.
// Ảnh: ui-loop/evidence/L03b43/<mode>-<trình duyệt>-<khung>(-card).png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b43';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const URL = 'http://localhost:3000/blogs/truoc-va-sau-1';
const mob = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const FRAMES = [
  ['chromium', '390', chromium, mob(390, 844)],
  ['webkit', 'iphone13', webkit, devices['iPhone 13']],
  ['chromium', '1440', chromium, { viewport: { width: 1440, height: 900 } }],
  ['chromium', '320', chromium, mob(320, 568)],
  ['chromium', '768', chromium, { viewport: { width: 768, height: 1024 } }],
  ['chromium', '1024', chromium, { viewport: { width: 1024, height: 768 } }],
  ['chromium', '844x390', chromium, mob(844, 390)],
];
const before = MODE === 'after' && fs.existsSync(`${OUT}/before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/before.json`, 'utf8')) : {};
const data = {}; const fails = []; let okN = 0;
const ok = (c, m) => { if (c) okN++; else { fails.push(m); console.log('✗ ' + m); } };
const near = (a, b, t) => Math.abs(a - b) <= t;

const measure = (p) => p.evaluate(() => {
  const FA = /awesome/i;
  const r1 = (v) => +v.toFixed(1);
  // Icon = phần tử con đầu của dòng: <i class="fa-…"> (before) hoặc <i> bọc <svg> (after)
  const slots = [];
  const groups = [['devbar', '.pc-bt-devbar .container'], ['empty', '.pc-bt-empty'], ['check', '.pc-bt-checks li']];
  for (const [g, sel] of groups) for (const row of document.querySelectorAll(sel)) {
    const i = row.querySelector(':scope > i'); if (!i) { slots.push({ g, none: true }); continue; }
    const svg = i.querySelector('svg');
    const ps = getComputedStyle(i, '::before');
    const glyph = FA.test(ps.fontFamily) && ps.content && ps.content !== 'none' && ps.content !== 'normal';
    const box = (svg || i).getBoundingClientRect();
    // dòng chữ: range văn bản sau icon
    const rg = document.createRange(); const tn = [...row.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    let tc = null, tH = null; if (tn) { rg.selectNodeContents(tn); const rr = rg.getClientRects()[0]; if (rr) { tc = rr.y + rr.height / 2; tH = rr.height; } }
    const rowR = row.getBoundingClientRect();
    slots.push({ g, kind: svg ? 'svg' : glyph ? 'fa' : 'other', cls: (i.getAttribute('class') || '').slice(0, 40), w: r1(box.width), h: r1(box.height),
      dy: tc == null ? null : r1(box.y + box.height / 2 - tc), fs: parseFloat(getComputedStyle(row).fontSize), color: getComputedStyle(svg || i).color,
      rowH: r1(rowR.height), state: row.className, vis: box.width > 0 && box.height > 0, textH: tH && r1(tH) });
  }
  let faEls = 0, faGlyph = 0;
  for (const el of document.querySelectorAll('body *')) {
    const cls = el.getAttribute('class') || '';
    if (/(^|\s)fa-[a-z0-9-]+/.test(cls) && el.getBoundingClientRect().width > 0) faEls++;
    for (const w of ['::before', '::after']) { const s = getComputedStyle(el, w); if (s.content && s.content !== 'none' && s.content !== 'normal' && s.content !== '""' && FA.test(s.fontFamily)) faGlyph++; }
  }
  return { slots, faEls, faGlyph, docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR/g) || []).length };
});

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForTimeout(1200);
  const m = await measure(p); m.errs = errs.length;
  const key = `${brn}-${fr}`; data[key] = m;
  await p.screenshot({ path: `${OUT}/${MODE}-${key}.png` });
  const card = p.locator('.pc-bt-empty').first().locator('xpath=ancestor::*[.//ul[contains(@class,"pc-bt-checks")]][1]');
  await card.screenshot({ path: `${OUT}/${MODE}-${key}-card.png` }).catch(() => {});
  const cnt = (k) => m.slots.filter((s) => s.kind === k).length;
  const by = (g) => m.slots.filter((s) => s.g === g).length;
  console.log(`${key}: icon fa ${cnt('fa')} · svg ${cnt('svg')} · khác ${cnt('other')} · devbar ${by('devbar')} empty ${by('empty')} check ${by('check')} · class fa-* ${m.faEls} · glyph FA ${m.faGlyph} · PC-ERROR ${m.pcErr} · cao ${m.docH} · lỗi JS ${m.errs}`);
  const uniq = new Map(); for (const s of m.slots) { const k = `${s.g}|${s.state}|${s.cls}`; if (!uniq.has(k)) uniq.set(k, s); }
  for (const s of uniq.values()) console.log(`   ${s.g} ${s.state || ''} ${s.kind}: ${s.w}×${s.h} (chữ ${s.fs}px) · lệch tâm dòng ${s.dy} · màu ${s.color} · cao dòng ${s.rowH}`);
  if (MODE === 'after') {
    const bm = before[key];
    ok(m.faEls === 0 && m.faGlyph === 0, `${key}: 0 class fa-* / glyph FA (${m.faEls}/${m.faGlyph}; before ${bm.faEls}/${bm.faGlyph})`);
    ok(['devbar', 'empty', 'check'].every((g) => by(g) === bm.slots.filter((s) => s.g === g).length) && m.slots.length === bm.slots.length, `${key}: số icon theo vị trí = before (${m.slots.length} / ${bm.slots.length})`);
    ok(m.slots.every((s) => s.kind === 'svg' && s.vis), `${key}: mọi icon là SVG nhìn thấy (${cnt('svg')}/${m.slots.length})`);
    m.slots.forEach((s, i) => {
      const o = bm.slots[i]; if (!o) return;
      if (!(near(s.w, s.fs, 1) && near(s.h, s.fs, 1))) ok(false, `${key} #${i} ${s.g}: icon ${s.w}×${s.h} ≠ cỡ chữ ${s.fs}`);
      else okN++;
      if (!(s.dy != null && o.dy != null && Math.abs(s.dy - o.dy) <= 2)) ok(false, `${key} #${i} ${s.g}: lệch tâm dòng ${s.dy} (before ${o.dy})`); else okN++;
      if (s.color !== o.color) ok(false, `${key} #${i} ${s.g}: màu ${s.color} ≠ before ${o.color}`); else okN++;
      if (!near(s.rowH, o.rowH, 2)) ok(false, `${key} #${i} ${s.g}: cao dòng ${s.rowH} vs before ${o.rowH}`); else okN++;
    });
    ok(near(m.docH, bm.docH, 2), `${key}: cao trang ${m.docH} vs before ${bm.docH}`);
    ok(m.errs <= bm.errs, `${key}: lỗi JS ${m.errs} ≤ before ${bm.errs}`);
    ok(m.pcErr === 0, `${key}: 0 PC-ERROR (${m.pcErr})`);
  }
  await b.close();
}
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify(data, null, 1));
console.log(MODE === 'after' ? `KẾT QUẢ: ${okN} ✔ / ${fails.length} ✗ ${fails.length ? '' : 'ĐẠT'}` : 'Đã ghi before.json');
process.exit(MODE === 'after' && fails.length ? 1 : 0);
