#!/usr/bin/env node
/*
  ui-loop/checks/D02.mjs — kiểm việc D02 (đổi tên class cũ trùng thư viện: pc-btn → pc-btn-v3, pc-section → pc-section-v3,
  pc-topbar → pc-topbar-v3) trên trình duyệt thật. Đổi tên thuần ⇒ giao diện phải giữ nguyên.
  Chạy:  node ui-loop/checks/D02.mjs before   (TRƯỚC khi đổi tên: ghi số đo + ảnh before-*)
         node ui-loop/checks/D02.mjs after    (SAU khi đổi tên: ghi số đo + ảnh after-*, so với before.json)
  Mỗi trang × khung đo mọi phần tử mang class cũ/mới: kích thước, vị trí x, display/position, nền, màu chữ, cỡ chữ, padding,
  margin, viền, bo góc + chiều cao trang. "after" đạt khi: 0 phần tử còn class cũ trần (pc-btn/pc-section/pc-topbar),
  số phần tử bằng nhau, mọi thuộc tính computed trùng khớp, kích thước lệch ≤ 1px, chiều cao trang lệch ≤ 2px.
  Tĩnh: grep .bwt/.css/.scss.bwt/.js (trừ thư viện ui-src, pc-ui.css, file sinh) 0 tham chiếu tên cũ.
  (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'D02');
const BASE = 'http://localhost:3000';
const PHASE = process.argv[2] === 'before' ? 'before' : 'after';
fs.mkdirSync(EVD, { recursive: true });
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

const NAMES = ['pc-btn', 'pc-section', 'pc-topbar'];
const PAGES = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/dat-lich-tu-van', '/?tpl=login',
  '/?tpl=search', '/skinhealthy-services', '/?tpl=orders', '/?tpl=order'];
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

// ---- Tĩnh: 0 tham chiếu tên cũ ngoài thư viện
if (PHASE === 'after') {
  const SKIP = /^(node_modules|dist|sapo-dist|vercel-dist|exports|test-results|ui-src|ui-loop|docs|\.git)(\/|$)/;
  const hits = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const r = d ? `${d}/${e.name}` : e.name;
    if (SKIP.test(r)) continue;
    if (e.isDirectory()) walk(r);
    else if (/\.(bwt|css|scss|js|mjs)$/.test(e.name) && r !== 'assets/pc-ui.css' && r !== 'scripts/ui-verify.mjs') {
      const t = fs.readFileSync(path.join(ROOT, r), 'utf8');
      for (const m of t.matchAll(/(?<![\w-])pc-(btn|section|topbar)(?![\w-])/g)) hits.push(`${r}: ${m[0]}`);
    }
  } };
  walk('');
  ok(hits.length === 0, `grep tên cũ ngoài thư viện: ${hits.length} tham chiếu${hits.length ? ' — ' + hits.slice(0, 10).join('; ') : ''}`);
}

const PROPS = ['display', 'position', 'backgroundColor', 'color', 'fontSize', 'fontWeight', 'paddingTop', 'paddingRight',
  'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'borderTopWidth', 'borderTopColor', 'borderRadius', 'zIndex', 'visibility'];
const out = {};
for (const c of CONFIGS) {
  const browser = await (c.b === 'webkit' ? webkit : chromium).launch();
  for (const url of PAGES) {
    const ctx = await browser.newContext(c.ctx);
    const page = await ctx.newPage();
    try { await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 45000 }); } catch { /* trang có kết nối kéo dài — đo sau load */ }
    await page.waitForTimeout(800);
    const m = await page.evaluate(({ NAMES, PROPS }) => {
      const res = { docH: document.documentElement.scrollHeight, bare: 0, els: {} };
      for (const n of NAMES) {
        const list = [...document.querySelectorAll(`.${n}, .${n}-v3`)];
        res.bare += document.querySelectorAll(`.${n}`).length;
        res.els[n] = list.map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
          const o = { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left) };
          for (const p of PROPS) o[p] = cs[p];
          return o; });
      }
      return res;
    }, { NAMES, PROPS });
    out[`${c.b}-${c.k}|${url}`] = m;
    await page.screenshot({ path: path.join(EVD, `${PHASE}-${c.b}-${c.k}-${slug(url)}.png`) });
    await ctx.close();
  }
  await browser.close();
}
fs.writeFileSync(path.join(EVD, `${PHASE}.json`), JSON.stringify(out, null, 1));

const cnt = (m) => NAMES.map((n) => `${n}:${m.els[n].length}`).join(' ');
if (PHASE === 'before') {
  for (const [k, m] of Object.entries(out)) console.log(`  ${k} — docH ${m.docH}px · ${cnt(m)}`);
  console.log(`[D02] Đã ghi ${Object.keys(out).length} lượt đo + ảnh before-* vào ui-loop/evidence/D02/`);
} else {
  const before = JSON.parse(fs.readFileSync(path.join(EVD, 'before.json'), 'utf8'));
  let compared = 0;
  for (const [k, a] of Object.entries(out)) {
    const b = before[k];
    if (!b) { ok(false, `${k}: thiếu số đo before`); continue; }
    const diffs = [];
    if (a.bare) diffs.push(`còn ${a.bare} phần tử mang class cũ`);
    if (Math.abs(a.docH - b.docH) > 2) diffs.push(`docH ${b.docH}→${a.docH}`);
    for (const n of NAMES) {
      if (a.els[n].length !== b.els[n].length) { diffs.push(`${n}: số phần tử ${b.els[n].length}→${a.els[n].length}`); continue; }
      a.els[n].forEach((e, i) => { const o = b.els[n][i]; compared++;
        for (const p of ['w', 'h', 'x']) if (Math.abs(e[p] - o[p]) > 1) diffs.push(`${n}[${i}].${p} ${o[p]}→${e[p]}`);
        for (const p of PROPS) if (e[p] !== o[p]) diffs.push(`${n}[${i}].${p} ${o[p]}→${e[p]}`); });
    }
    ok(diffs.length === 0, `${k} — docH ${b.docH}→${a.docH}px · ${cnt(a)} · class cũ trần ${a.bare}${diffs.length ? ' · LỆCH: ' + diffs.slice(0, 6).join('; ') : ''}`);
  }
  console.log(`[D02] So ${compared} phần tử × ${PROPS.length + 3} thuộc tính ở ${Object.keys(out).length} lượt trang × khung`);
  console.log(fail ? `[D02] CHƯA ĐẠT (${fail} mục)` : '[D02] ĐẠT');
  process.exit(fail ? 1 : 0);
}
