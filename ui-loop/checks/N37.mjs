// N37 — mốc baseline webkit390 /collections/all (vòng 71, 01/11/2026).
// Bối cảnh: chủ dự án duyệt 31/10 (N28) ghi mốc mục này = số đo sau bản vá (≈ 120/40 = m390); commit 559a87f (L03b12)
// --write-baseline bắt đúng 1 lượt WebKit dao động (90/24) nên hạ mốc về 90/24 ⇒ mọi --quick có /collections/all báo 2 «lỗi mới».
// Script:
//   node ui-loop/checks/N37.mjs reports <r1.json> <r2.json> <r3.json>   — 3 lượt --quick: webkit390 = m390, chỉ lệch mốc ở 2 chỉ số N37
//   node ui-loop/checks/N37.mjs baseline                                — so baseline đang làm việc với bản HEAD: chỉ mục webkit390 /collections/all đổi, về 120/40, không nới mục khác
//   node ui-loop/checks/N37.mjs shots                                   — 7 khung Chromium + WebKit: khối «Bán chạy» đã chèn thẻ, ảnh evidence/N37/
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium, webkit, devices } from 'playwright';

const ROOT = process.cwd();
const P = '/collections/all';
let ok = 0, bad = 0;
const t = (cond, msg) => { if (cond) { ok++; console.log('  ✔', msg); } else { bad++; console.log('  ✗', msg); } };
const key = (r) => r.vp + ' ' + r.path;
const mode = process.argv[2];

if (mode === 'reports') {
  const base = JSON.parse(fs.readFileSync('ui-loop/baseline.json', 'utf8'));
  const bmap = new Map(base.pages.map((r) => [key(r), r]));
  for (const f of process.argv.slice(3)) {
    const r = JSON.parse(fs.readFileSync(f, 'utf8'));
    const pg = r.pages.filter((x) => x.path === P);
    const m = pg.find((x) => x.vp === 'm390'), w = pg.find((x) => x.vp === 'webkit390');
    console.log(path.basename(f), pg.map((x) => `${x.vp}:${x.issues['touch<44'] || 0}/${x.issues.noName || 0}`).join(' '));
    t(w && m && w.issues['touch<44'] === m.issues['touch<44'] && w.issues.noName === m.issues.noName, `webkit390 touch<44/noName = m390 (${w?.issues['touch<44']}/${w?.issues.noName} vs ${m?.issues['touch<44']}/${m?.issues.noName})`);
    const extra = [];
    for (const x of pg) {
      const b = bmap.get(key(x)); if (!b) { extra.push(key(x) + ' không có mốc'); continue; }
      for (const [k, v] of Object.entries(x.issues)) {
        if (v > (b.issues[k] || 0) && !(x.vp === 'webkit390' && (k === 'touch<44' || k === 'noName'))) extra.push(`${key(x)} ${k} ${b.issues[k] || 0}→${v}`);
      }
    }
    t(extra.length === 0, `ngoài 2 chỉ số N37 không chỉ số nào vượt mốc${extra.length ? ': ' + extra.join('; ') : ''}`);
  }
} else if (mode === 'baseline') {
  const cur = JSON.parse(fs.readFileSync('ui-loop/baseline.json', 'utf8'));
  const head = JSON.parse(execSync('git show HEAD:ui-loop/baseline.json', { maxBuffer: 1e9 }).toString());
  const hmap = new Map(head.pages.map((r) => [key(r), r]));
  const changed = [], loosened = [];
  for (const r of cur.pages) {
    const h = hmap.get(key(r));
    if (!h) { changed.push(key(r) + ' (mới)'); continue; }
    if (JSON.stringify(h.issues) !== JSON.stringify(r.issues)) changed.push(key(r));
    for (const [k, v] of Object.entries(r.issues)) if (v > (h.issues[k] || 0)) loosened.push(`${key(r)} ${k} ${h.issues[k] || 0}→${v}`);
  }
  console.log('Mục đổi issues:', changed.join(' | ') || '(không)');
  console.log('Chỉ số tăng:', loosened.join(' | ') || '(không)');
  const w = cur.pages.find((x) => x.vp === 'webkit390' && x.path === P), m = cur.pages.find((x) => x.vp === 'm390' && x.path === P);
  t(w.issues['touch<44'] === 120 && w.issues.noName === 40, `mốc webkit390 ${P} = 120/40 (đo: ${w.issues['touch<44']}/${w.issues.noName})`);
  t(w.issues['touch<44'] === m.issues['touch<44'] && w.issues.noName === m.issues.noName, 'mốc webkit390 = mốc m390');
  t(loosened.every((s) => s.startsWith(`webkit390 ${P} touch<44`) || s.startsWith(`webkit390 ${P} noName`)), 'không nới chỉ số nào khác ngoài 2 chỉ số N37');
  t(cur.pages.length === head.pages.length, `số mục baseline giữ nguyên (${head.pages.length} → ${cur.pages.length})`);
} else if (mode === 'shots') {
  const OUT = 'ui-loop/evidence/N37'; fs.mkdirSync(OUT, { recursive: true });
  const VPS = [
    ['chromium', '390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
    ['webkit', '390', { ...devices['iPhone 13'] }],
    ['chromium', '320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }],
    ['chromium', '768', { viewport: { width: 768, height: 1024 } }],
    ['chromium', '1024', { viewport: { width: 1024, height: 768 } }],
    ['chromium', '1440', { viewport: { width: 1440, height: 900 } }],
    ['chromium', '844x390', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }],
  ];
  const engines = { chromium: await chromium.launch(), webkit: await webkit.launch() };
  for (const [eng, name, opts] of VPS) {
    const ctx = await engines[eng].newContext(opts); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto('http://localhost:3000' + P, { waitUntil: 'load' });
    // cuộn thật bằng bánh xe tới khối «Bán chạy»
    const t0 = Date.now(); let n = 0;
    for (let i = 0; i < 40 && n < 4; i++) {
      // WebKit mobile không hỗ trợ mouse.wheel ⇒ cuộn từng bước 300px bằng window.scrollBy
      if (eng === 'webkit') await page.evaluate(() => window.scrollBy(0, 300)); else await page.mouse.wheel(0, 300);
      await page.waitForTimeout(150);
      n = await page.evaluate(() => document.querySelectorAll('.pc-col-bestseller .swiper-slide .btn-cart, .pc-col-bestseller .swiper-slide a[href*="/products/"]').length);
    }
    const ms = Date.now() - t0;
    const box = await page.evaluate(() => { const e = document.querySelector('.pc-col-bestseller'); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { h: Math.round(r.height), slides: e.querySelectorAll('.swiper-slide').length }; });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/after-${eng}-${name}.png` });
    console.log(`${eng} ${name}: thẻ SP trong khối ${n}, slide ${box?.slides}, cao khối ${box?.h}px, chèn sau ${ms}ms, lỗi JS ${errs.length}`);
    t(n >= 4 && errs.length === 0, `${eng} ${name}: khối «Bán chạy» chèn ≥ 4 thẻ, 0 lỗi JS`);
    await ctx.close();
  }
  await engines.chromium.close(); await engines.webkit.close();
}
console.log(`\nN37 ${mode}: ${ok} ✔ / ${bad} ✗`);
process.exit(bad ? 1 : 0);
