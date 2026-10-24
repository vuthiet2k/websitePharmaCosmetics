#!/usr/bin/env node
/*
  ui-loop/checks/N11.mjs — kiểm việc N11: nút đóng popup `.pc-modal__close` (thẻ <button>) không còn nền / viền outset /
  padding mặc định của trình duyệt (preflight tắt).
  Trang kit /?tpl=page.ui-kit, popup #kit-modal mở, 7 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13),
  bản HEAD (đối chứng, pc-ui.css HEAD qua page.route) và bản sửa:
    (a) nền transparent hoặc trắng; border-style 4 cạnh none (hoặc width 0); 44×44px; padding 0;
    (b) icon X (svg) nhìn thấy: rect > 0, nằm trong nút, màu nét so nền popup ≥ 3:1 (B.7 icon);
    (c) tâm nút elementFromPoint trúng nút (hoặc icon trong nút); hover chuột: nền vẫn transparent/trắng;
    (d) Tab từ popup (focus #kit-modal) tới nút đóng ⇒ outline solid 2px rgb(7,91,64); Shift+Tab từ phần tử kế quay lại nút;
  hồi quy: axe WCAG 2.2 A/AA trong #kit-modal = 0; computed style (nền, viền, cỡ, màu, padding) của mọi phần tử .pc-* khác
  trong #pc-kit HEAD = sau; quy tắc pc-ui.css ngoài `.pc-modal__close{…}` trùng 100% bản HEAD.
  Chạy: node ui-loop/checks/N11.mjs   (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N11');
const BASE = 'http://localhost:3000';
const HEAD_CSS = fs.readFileSync(path.join(EVD, 'head-pc-ui.css'), 'utf8');
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

const FRAMES = [
  { name: 'chromium-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'webkit-390', engine: webkit, opts: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', engine: chromium, opts: { viewport: { width: 320, height: 568 } } },
  { name: 'chromium-768', engine: chromium, opts: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', engine: chromium, opts: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'chromium-844x390', engine: chromium, opts: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];

const browsers = {};
const open = async (f, head) => {
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext({ ...f.opts, reducedMotion: 'reduce' }); const page = await ctx.newPage();
  if (head) await page.route(/pc-ui\.css/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: HEAD_CSS }));
  const res = await page.goto(BASE + '/?tpl=page.ui-kit', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  return { ctx, page, status: res.status() };
};
const setModal = (page, show) => page.evaluate((s) => {
  document.getElementById('kit-modal').hidden = !s; document.querySelector('[data-pc-modal-overlay="kit-modal"]').hidden = !s;
}, show);

const measure = () => {
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const [r, g, b] = m.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const btn = document.querySelector('#kit-modal .pc-modal__close'); const cs = getComputedStyle(btn); const r = btn.getBoundingClientRect();
  const svg = btn.querySelector('svg'); const sr = svg ? svg.getBoundingClientRect() : null; const scs = svg ? getComputedStyle(svg) : null;
  const modalBg = getComputedStyle(document.getElementById('kit-modal')).backgroundColor;
  const stroke = scs ? (scs.stroke && scs.stroke !== 'none' ? scs.stroke : scs.color) : null;
  const cx = r.left + r.width / 2; const cy = r.top + r.height / 2; const hit = document.elementFromPoint(cx, cy);
  return {
    bg: cs.backgroundColor, bgImg: cs.backgroundImage,
    border: ['Top', 'Right', 'Bottom', 'Left'].map((s) => `${cs['border' + s + 'Style']} ${cs['border' + s + 'Width']}`),
    padding: cs.padding, w: +r.width.toFixed(1), h: +r.height.toFixed(1), rect: [r.left, r.top].map((v) => Math.round(v)),
    radius: cs.borderRadius, appearance: cs.appearance || cs.webkitAppearance,
    svg: sr ? { w: +sr.width.toFixed(1), h: +sr.height.toFixed(1), inside: sr.left >= r.left - 0.5 && sr.right <= r.right + 0.5 && sr.top >= r.top - 0.5 && sr.bottom <= r.bottom + 0.5,
      display: scs.display, visibility: scs.visibility, opacity: scs.opacity, stroke } : null,
    contrast: stroke ? +ratio(stroke, modalBg).toFixed(2) : 0, modalBg,
    hitOk: !!hit && (hit === btn || btn.contains(hit)), hitEl: hit ? hit.tagName.toLowerCase() + '.' + [...hit.classList].join('.') : '',
  };
};
const transparentOrWhite = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent' || c === 'rgb(255, 255, 255)';
const noBorder = (arr) => arr.every((s) => s.startsWith('none'));

// Computed style của các phần tử .pc-* khác trong kit (hồi quy)
const pcStyles = () => [...document.querySelectorAll('#pc-kit [class*="pc-"]')].filter((e) => !e.classList.contains('pc-modal__close')).map((e, i) => {
  const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
  return [i, e.tagName, e.className, cs.backgroundColor, cs.borderTopStyle, cs.borderTopWidth, cs.borderTopColor, cs.padding, cs.color,
    cs.display, cs.position, Math.round(r.width), Math.round(r.height)].join('|');
});

const out = {};
for (const f of FRAMES) {
  const rec = out[f.name] = {};
  for (const mode of ['head', 'after']) {
    const head = mode === 'head';
    const { ctx, page, status } = await open(f, head);
    const tag = `${f.name} ${head ? 'HEAD' : 'sửa'}`;
    const styles = await page.evaluate(pcStyles);
    await setModal(page, true); await page.waitForTimeout(300);
    const m = await page.evaluate(measure);
    // hover
    await page.mouse.move(m.rect[0] + m.w / 2, m.rect[1] + m.h / 2); await page.waitForTimeout(250);
    const hoverBg = await page.evaluate(() => getComputedStyle(document.querySelector('#kit-modal .pc-modal__close')).backgroundColor);
    await page.mouse.move(1, 1);
    // ảnh: khung nhìn với popup mở + cận cảnh nút đóng
    await page.screenshot({ path: path.join(EVD, `${head ? 'before' : 'after'}-${f.engine.name()}-${f.name.split('-')[1]}.png`) });
    const clip = { x: Math.max(0, m.rect[0] - 40), y: Math.max(0, m.rect[1] - 12), width: Math.min(140, f.opts.viewport?.width || 390), height: 72 };
    await page.screenshot({ path: path.join(EVD, `${head ? 'before' : 'after'}-${f.engine.name()}-${f.name.split('-')[1]}-close.png`), clip });
    // Tab / Shift+Tab
    await page.evaluate(() => document.getElementById('kit-modal').focus());
    await page.keyboard.press('Tab'); await page.waitForTimeout(150);
    const tabF = await page.evaluate(() => { const a = document.activeElement; const cs = getComputedStyle(a);
      return { isClose: a.classList.contains('pc-modal__close'), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` }; });
    if (!head) await page.screenshot({ path: path.join(EVD, `after-${f.engine.name()}-${f.name.split('-')[1]}-focus.png`), clip });
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(150);
    const back = await page.evaluate(() => document.activeElement.classList.contains('pc-modal__close'));
    let axe = null;
    if (!head) {
      await page.addScriptTag({ content: AXE_SRC });
      axe = await page.evaluate(async () => (await window.axe.run({ include: [['#kit-modal']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }))
        .violations.map((v) => `${v.id}×${v.nodes.length}`));
    }
    rec[mode] = { status, m, hoverBg, tabF, back, axe, styles };
    console.log(`  · ${tag}: nền ${m.bg} (hover ${hoverBg}); viền ${m.border.join(' / ')}; padding ${m.padding}; ${m.w}×${m.h}px; ` +
      `icon ${m.svg ? `${m.svg.w}×${m.svg.h} nét ${m.svg.stroke} tương phản ${m.contrast}:1` : 'KHÔNG CÓ'}; tâm trúng ${m.hitOk ? 'nút' : m.hitEl}; ` +
      `Tab → ${tabF.isClose ? 'nút đóng' : 'KHÁC'} viền ${tabF.outline}; Shift+Tab về nút ${back}`);
    if (!head) {
      ok(status === 200, `${tag}: HTTP ${status}`);
      ok(transparentOrWhite(m.bg) && m.bgImg === 'none', `${tag}: nền ${m.bg} (transparent/trắng), background-image ${m.bgImg}`);
      ok(transparentOrWhite(hoverBg), `${tag}: nền khi hover ${hoverBg}`);
      ok(noBorder(m.border), `${tag}: viền ${m.border.join(' / ')}`);
      ok(m.padding === '0px', `${tag}: padding ${m.padding}`);
      ok(m.w >= 44 && m.h >= 44, `${tag}: cỡ ${m.w}×${m.h}px ≥ 44`);
      ok(m.svg && m.svg.w >= 20 && m.svg.h >= 20 && m.svg.inside && m.svg.display !== 'none' && m.svg.visibility !== 'hidden' && m.svg.opacity !== '0',
        `${tag}: icon X ${m.svg ? `${m.svg.w}×${m.svg.h}, trong nút ${m.svg.inside}` : 'không có'}`);
      ok(m.contrast >= 3, `${tag}: tương phản icon ${m.contrast}:1 ≥ 3:1 (nền popup ${m.modalBg})`);
      ok(m.hitOk, `${tag}: tâm nút elementFromPoint trúng nút (${m.hitEl})`);
      ok(tabF.isClose && tabF.outline === 'solid 2px rgb(7, 91, 64)', `${tag}: Tab tới nút đóng — viền ${tabF.outline}`);
      ok(back, `${tag}: Shift+Tab quay lại nút đóng`);
      ok(axe.length === 0, `${tag}: axe #kit-modal ${axe.length} vi phạm${axe.length ? ' — ' + axe.join(', ') : ''}`);
      const hs = rec.head.styles; const as = styles; const d = as.filter((x, i) => x !== hs[i]);
      ok(hs.length === as.length && d.length === 0, `${tag}: ${as.length} phần tử .pc-* khác trong kit — computed HEAD = sau (lệch ${d.length})${d.length ? ': ' + d.slice(0, 3).join(' ;; ') : ''}`);
    }
    await ctx.close();
  }
}
for (const b of Object.values(browsers)) await b.close();

// Hồi quy CSS: mọi quy tắc pc-ui.css trừ `.pc-modal__close{…}` trùng bản HEAD
function splitRules(css) {
  const res = []; let depth = 0; let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) { res.push(css.slice(start, i + 1)); start = i + 1; } }
  }
  return res;
}
const rules = (css) => { const list = [];
  const walk = (txt, ctx) => { for (const r of splitRules(txt)) { const h = r.slice(0, r.indexOf('{')).trim();
    if (h.startsWith('@media') || h.startsWith('@supports') || h.startsWith('@layer')) walk(r.slice(r.indexOf('{') + 1, -1), ctx + h);
    else if (h !== '.pc-modal__close') list.push(ctx + '|' + r.trim()); } };
  walk(css, ''); return list; };
const a = rules(HEAD_CSS); const b2 = rules(fs.readFileSync(path.join(ROOT, 'assets', 'pc-ui.css'), 'utf8'));
const sa = new Set(a); const sb = new Set(b2);
const diff = b2.filter((x) => !sa.has(x)).length + a.filter((x) => !sb.has(x)).length;
ok(diff === 0 && a.length === b2.length, `quy tắc pc-ui.css ngoài .pc-modal__close: HEAD ${a.length} / sau ${b2.length}, lệch ${diff}`);

for (const v of Object.values(out)) for (const k of ['head', 'after']) delete v[k].styles;
fs.writeFileSync(path.join(EVD, 'result.json'), JSON.stringify(out, null, 1));
console.log(`\n[N11] ${fail ? 'CHƯA ĐẠT — ' + fail + ' mục sai' : 'ĐẠT mọi mục'}`);
process.exit(fail ? 1 : 0);
