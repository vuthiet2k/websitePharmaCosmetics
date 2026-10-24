#!/usr/bin/env node
/*
  ui-loop/checks/N10.mjs — kiểm việc N10: popup thư viện đang mở thì header cũ (header.header, .main-header, .pc-topbar-v3,
  .header-menu dính khi cuộn) phải nằm DƯỚI lớp phủ `.pc-overlay` (z 50) — bị phủ mờ, không bấm được.
  Trang kit /?tpl=page.ui-kit ở 7 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13), 2 trạng thái cuộn
  (đầu trang; cuộn 1200px — header dính / .hSticky desktop), bản HEAD (đối chứng, pc-ui.css HEAD qua page.route) và bản sửa:
    (a) popup mở ⇒ lưới 5 x × 3 y (5px, giữa, đáy − 4px) trên dải header nhìn thấy trúng .pc-overlay / .pc-modal 15/15,
        0 điểm trúng phần tử trong header.header;
    (b) bấm chuột thật vào nút header nhìn thấy (☰, giỏ, ngôn ngữ, menu desktop) khi popup mở ⇒ URL không đổi, trạng thái
        class / aria-expanded của header không đổi;
    (c) đóng popup ⇒ position / z-index / isolation của header.header, .main-header, .pc-topbar-v3 về như trước khi mở;
  hồi quy: popup đóng, 6 trang Q × Chromium 390/1440 + WebKit 390 × 2 trạng thái cuộn — position / z-index / isolation + rect
  của header.header, .main-header, .pc-topbar-v3, .header-menu bản HEAD = sau (lệch rect ≤ 1px); quy tắc ngoài `.pc-` trong
  pc-ui.css trùng 100% bản HEAD.
  Chạy: node ui-loop/checks/N10.mjs   (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N10');
const BASE = 'http://localhost:3000';
const HEAD_CSS = fs.readFileSync(path.join(EVD, 'head-pc-ui.css'), 'utf8');
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
const SCROLLS = [0, 1200];
const Q = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/dat-lich-tu-van', '/?tpl=login'];

const browsers = {};
const open = async (f, head, url = '/?tpl=page.ui-kit', scroll = 0) => {
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext({ ...f.opts, reducedMotion: 'reduce' }); const page = await ctx.newPage();
  if (head) await page.route(/pc-ui\.css/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: HEAD_CSS }));
  const res = await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  if (scroll) { await page.evaluate((y) => window.scrollTo(0, y), scroll); await page.waitForTimeout(600); }
  return { ctx, page, status: res.status() };
};
const setModal = (page, show) => page.evaluate((s) => {
  document.getElementById('kit-modal').hidden = !s; document.querySelector('[data-pc-modal-overlay="kit-modal"]').hidden = !s;
}, show);

// Thuộc tính xếp lớp + rect của các phần tử header
const headerProps = () => {
  const pick = (sel) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { position: cs.position, z: cs.zIndex, iso: cs.isolation, display: cs.display,
      rect: [r.left, r.top, r.width, r.height].map((v) => Math.round(v)) }; };
  return { header: pick('header.header'), main: pick('.main-header'), topbar: pick('.pc-topbar-v3'), menu: pick('header.header .header-menu') };
};

// Dải header nhìn thấy + lưới điểm thử
const gridHits = () => {
  const header = document.querySelector('header.header');
  const vis = (e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
  const boxes = [header, ...header.querySelectorAll('*')].filter((e) => e === header || ['fixed', 'sticky'].includes(getComputedStyle(e).position)).filter(vis);
  let top = Infinity; let bottom = -Infinity;
  for (const e of boxes) { const r = e.getBoundingClientRect(); top = Math.min(top, Math.max(0, r.top)); bottom = Math.max(bottom, Math.min(innerHeight, r.bottom)); }
  if (!(bottom > top)) return { band: null, hits: [] };
  const ys = [...new Set([top + 5, (top + bottom) / 2, bottom - 4].map((y) => Math.round(y)))];
  const xs = [0.02, 0.25, 0.5, 0.75, 0.98].map((t) => Math.round(innerWidth * t));
  const hits = [];
  for (const y of ys) for (const x of xs) {
    const h = document.elementFromPoint(x, y);
    const kind = !h ? 'không có' : h.closest('.pc-overlay, .pc-modal') ? 'phủ' : header.contains(h) ? 'HEADER' : 'khác';
    hits.push({ x, y, kind, el: h ? h.tagName.toLowerCase() + '.' + [...h.classList].slice(0, 2).join('.') : '' });
  }
  return { band: [Math.round(top), Math.round(bottom)], hits };
};

// Nút header nhìn thấy (toạ độ tâm) để bấm thật
const headerTargets = () => {
  const sels = ['#btn-menu-mobile', '.header-action_cart a', '.pc-topbar-v3 .lang-btn', 'header.header a.nav-link'];
  const out = [];
  for (const s of sels) {
    const e = [...document.querySelectorAll(s)].find((x) => { const r = x.getBoundingClientRect(); const cs = getComputedStyle(x);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight; });
    if (e) { const r = e.getBoundingClientRect(); out.push({ sel: s, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }); }
  }
  return out;
};
const headerState = () => [...document.querySelectorAll('header.header, header.header *')]
  .map((e) => e.className + '|' + (e.getAttribute('aria-expanded') || '')).join(';') + '#' + document.body.className;

const out = {};
for (const f of FRAMES) {
  const rec = out[f.name] = {};
  for (const mode of ['head', 'after']) {
    const head = mode === 'head';
    for (const sc of SCROLLS) {
      const tag = `${f.name} ${head ? 'HEAD' : 'sửa'} cuộn ${sc}`;
      const { ctx, page, status } = await open(f, head, '/?tpl=page.ui-kit', sc);
      if (!head && sc === 0) ok(status === 200, `${f.name}: HTTP ${status}`);
      const closed = await page.evaluate(headerProps);
      await setModal(page, true); await page.waitForTimeout(300);
      const g = await page.evaluate(gridHits);
      const opened = await page.evaluate(headerProps);
      const bad = g.hits.filter((h) => h.kind !== 'phủ');
      console.log(`  · ${tag}: dải header ${g.band ? g.band.join('–') + 'px' : 'không nhìn thấy'}; header z ${opened.header?.z} iso ${opened.header?.iso} pos ${opened.header?.position}; ` +
        `trúng lớp phủ/popup ${g.hits.length - bad.length}/${g.hits.length}${bad.length ? ' — lọt: ' + bad.slice(0, 4).map((h) => `(${h.x},${h.y}) ${h.el}`).join(', ') : ''}`);
      await page.screenshot({ path: path.join(EVD, `${head ? 'before' : 'after'}-${f.name}-cuon${sc}.png`) });
      // Bấm chuột thật vào nút header (toạ độ đo khi popup đóng vẫn đúng chỗ khi mở)
      await setModal(page, false); const targets = await page.evaluate(headerTargets); await setModal(page, true); await page.waitForTimeout(200);
      const clicks = [];
      for (const t of targets) {
        const url0 = page.url(); const st0 = await page.evaluate(headerState);
        await page.mouse.click(t.x, t.y); await page.waitForTimeout(500);
        const url1 = page.url(); const st1 = await page.evaluate(headerState).catch(() => 'điều hướng');
        clicks.push({ sel: t.sel, urlSame: url0 === url1, stateSame: st0 === st1 });
        if (url0 !== url1) { await page.goBack().catch(() => {}); break; }
      }
      console.log(`    bấm thật: ${clicks.map((c) => `${c.sel} ${c.urlSame && c.stateSame ? 'không tác dụng' : 'CÓ TÁC DỤNG' + (c.urlSame ? ' (đổi trạng thái)' : ' (đổi URL)')}`).join('; ') || 'không có nút nhìn thấy'}`);
      let reclosed = null;
      if (clicks.every((c) => c.urlSame)) { await setModal(page, false); await page.waitForTimeout(200); reclosed = await page.evaluate(headerProps); }
      rec[`${mode}-${sc}`] = { closed, opened, grid: g, clicks, reclosed };
      if (!head) {
        ok(g.band === null || (g.hits.length > 0 && bad.length === 0), `${tag}: lưới header trúng lớp phủ/popup ${g.hits.length - bad.length}/${g.hits.length}`);
        ok(targets.length > 0 || g.band === null, `${tag}: có ${targets.length} nút header nhìn thấy để bấm thử`);
        ok(clicks.every((c) => c.urlSame && c.stateSame), `${tag}: bấm ${clicks.length} nút header khi popup mở — 0 tác dụng`);
        const z = (p) => p && `${p.position}/${p.z}/${p.iso}`;
        ok(reclosed && ['header', 'main', 'topbar'].every((k) => z(reclosed[k]) === z(closed[k])),
          `${tag}: đóng popup ⇒ header ${z(reclosed?.header)}, main ${z(reclosed?.main)}, topbar ${z(reclosed?.topbar)} = trước khi mở`);
      }
      await ctx.close();
    }
  }
}

// Hồi quy: popup đóng, trang Q
console.log('\n[N10] hồi quy header trên 6 trang Q (popup đóng)');
const RF = FRAMES.filter((f) => ['chromium-390', 'webkit-390', 'chromium-1440'].includes(f.name));
let same = 0; let total = 0; const reg = {};
for (const f of RF) for (const url of Q) for (const sc of SCROLLS) {
  const m = {};
  for (const mode of ['head', 'after']) {
    const { ctx, page } = await open(f, mode === 'head', url, sc);
    m[mode] = await page.evaluate(headerProps); await ctx.close();
  }
  const diffs = [];
  for (const k of ['header', 'main', 'topbar', 'menu']) {
    const a = m.head[k]; const b = m.after[k];
    if (!a && !b) continue;
    if (!a || !b) { diffs.push(`${k} có/không`); continue; }
    for (const p of ['position', 'z', 'iso', 'display']) if (a[p] !== b[p]) diffs.push(`${k}.${p} ${a[p]}→${b[p]}`);
    if (a.rect.some((v, i) => Math.abs(v - b.rect[i]) > 1)) diffs.push(`${k}.rect ${a.rect}→${b.rect}`);
  }
  total++; if (!diffs.length) same++;
  reg[`${f.name} ${url} ${sc}`] = { head: m.head, after: m.after, diffs };
  if (diffs.length) console.log(`  ✗ ${f.name} ${url} cuộn ${sc}: ${diffs.join(', ')}`);
}
ok(same === total, `hồi quy header Q: ${same}/${total} lượt HEAD = sau`);
for (const b of Object.values(browsers)) await b.close();

// Hồi quy CSS: quy tắc ngoài .pc- trong pc-ui.css trùng bản HEAD
function splitRules(css) {
  const res = []; let depth = 0; let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) { res.push(css.slice(start, i + 1)); start = i + 1; } }
  }
  return res;
}
const nonPc = (css) => { const rules = [];
  const walk = (txt, ctx) => { for (const r of splitRules(txt)) { const h = r.slice(0, r.indexOf('{')).trim();
    if (h.startsWith('@media') || h.startsWith('@supports') || h.startsWith('@layer')) walk(r.slice(r.indexOf('{') + 1, -1), ctx + h);
    else if (!h.includes('.pc-')) rules.push(ctx + '|' + r.trim()); } };
  walk(css, ''); return rules; };
const a = nonPc(HEAD_CSS); const b2 = nonPc(fs.readFileSync(path.join(ROOT, 'assets', 'pc-ui.css'), 'utf8'));
const sa = new Set(a); const sb = new Set(b2);
const diff = b2.filter((x) => !sa.has(x)).length + a.filter((x) => !sb.has(x)).length;
ok(diff === 0 && a.length === b2.length, `quy tắc ngoài .pc- trong pc-ui.css: HEAD ${a.length} / sau ${b2.length}, lệch ${diff}`);

fs.writeFileSync(path.join(EVD, 'result.json'), JSON.stringify({ kit: out, regression: reg }, null, 1));
console.log(`\n[N10] ${fail ? 'CHƯA ĐẠT — ' + fail + ' mục sai' : 'ĐẠT mọi mục'}`);
process.exit(fail ? 1 : 0);
