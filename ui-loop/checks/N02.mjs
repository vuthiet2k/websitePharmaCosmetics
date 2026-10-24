#!/usr/bin/env node
/*
  ui-loop/checks/N02.mjs — kiểm việc N02 (hồi quy của D03): quy tắc nền trong pc-ui.css không được đổi giao diện phần tử
  CŨ (ngoài thư viện pc-*) — `p a, li a { underline; color brand }` gạch chân menu header, breadcrumb, link trong li/p.
  6 trang Q × 7 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13):
    (a) bật/tắt pc-ui.css ngay trong trang (styleSheet.disabled): số phần tử ngoài thư viện đổi textDecorationLine / color = 0;
    (b) so ui-loop/evidence/D03/before.json (đo trước khi nạp pc-ui.css; so theo chỉ số khi số phần tử bằng nhau):
        số lượt none → underline và số lượt đổi màu (tham khảo — trang có nội dung động có thể lệch);
    (c) a.nav-link header ở 1440: textDecorationLine none;
    (d) 1440: ảnh khung nhìn đầu khi bật vs tắt pc-ui.css — % điểm ảnh khác;
    (e) trang chủ: kích thước div.most-view-product-img khi bật vs khi chặn hẳn pc-ui.css (route trả CSS rỗng, nạp lại trang)
        + quy tắc pc-ui.css khớp chính phần tử / tổ tiên (ghi lại để xác định đúng/sai thiết kế).
  Chạy: node ui-loop/checks/N02.mjs [--before]   (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N02');
const BASE = 'http://localhost:3000';
const TAG = process.argv.includes('--before') ? 'before' : 'after';
fs.mkdirSync(EVD, { recursive: true });
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

// Tên class thư viện lấy từ nguồn components.css; loại class CŨ chỉ nhắc trong comment/selector chuyển tiếp
// (pc-bottom-nav, pc-site-v3 trên <body>, pc-has-bottomnav) — nếu không mọi phần tử trang đều bị coi là "thư viện"
const LIB = [...new Set((fs.readFileSync(path.join(ROOT, 'ui-src/css/components.css'), 'utf8').match(/\.pc-[a-z0-9_-]+/g) || [])
  .map((s) => s.slice(1)))].filter((c) => !['pc-bottom-nav', 'pc-site-v3', 'pc-has-bottomnav'].includes(c));
const D03 = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui-loop/evidence/D03/before.json'), 'utf8'));
// before.json không lưu tên phần tử; after.json của D03 (cùng cây DOM, cùng số phần tử) có — mượn để căn
const D03A = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui-loop/evidence/D03/after.json'), 'utf8'));
for (const [k, v] of Object.entries(D03)) if (!v.ids && D03A[k]?.ids?.length === v.els.length) v.ids = D03A[k].ids;
const D03_PROPS = ['w', 'h', 'display', 'color', 'fontSize', 'textDecorationLine', 'borderTopStyle', 'borderTopWidth', 'backgroundColor'];

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

// Đo cùng 1 danh sách phần tử khi bật rồi khi tắt pc-ui.css (trong 1 lần evaluate — DOM động không làm lệch chỉ số)
const toggleDiff = (LIB) => {
  const libSel = LIB.map((c) => '.' + c).join(',');
  const els = [...document.body.querySelectorAll('*')];
  const read = () => els.map((e) => { const cs = getComputedStyle(e); return [cs.color, cs.textDecorationLine]; });
  const sheets = [...document.styleSheets].filter((s) => s.href && /pc-ui\.css/.test(s.href));
  const on = read(); sheets.forEach((s) => { s.disabled = true; }); const off = read(); sheets.forEach((s) => { s.disabled = false; });
  const diffs = [];
  els.forEach((e, i) => { if (e.closest(libSel)) return; const [c1, d1] = on[i], [c0, d0] = off[i];
    if (c1 !== c0 || d1 !== d0) { const id = e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
      diffs.push(`${id} {${d1 !== d0 ? `deco ${d0}→${d1}` : ''}${c1 !== c0 ? ` color ${c0}→${c1}` : ''}}`); } });
  return { n: els.length, sheets: sheets.length, diffs };
};
const setPc = (on) => { for (const s of document.styleSheets) if (s.href && /pc-ui\.css/.test(s.href)) s.disabled = !on; };
const D03snap = () => [...document.body.querySelectorAll('*')].map((e) => {
  const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
  const id = e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/s+/).slice(0, 2).join('.') : '');
  return { id, s: [Math.round(r.width), Math.round(r.height), ...['display', 'color', 'fontSize', 'textDecorationLine', 'borderTopStyle', 'borderTopWidth', 'backgroundColor'].map((p) => cs[p])].join('|') };
});
// Căn 2 dãy phần tử theo tên (tag.class) — bỏ qua phần tử thêm/bớt (nội dung động, commit sau D03) trong cửa sổ 40
const align = (aIds, bIds) => { const pairs = []; let i = 0, j = 0;
  while (i < aIds.length && j < bIds.length) { if (aIds[i] === bIds[j]) { pairs.push([i++, j++]); continue; }
    let k = 1; for (; k <= 40; k++) { if (aIds[i + k] === bIds[j]) { i += k; break; } if (aIds[i] === bIds[j + k]) { j += k; break; } }
    if (k > 40) { i++; j++; } }
  return pairs; };
const mostView = () => [...document.querySelectorAll('.most-view-product-img')].slice(0, 3).map((e) => {
  const r = e.getBoundingClientRect(); return `${Math.round(r.width)}×${Math.round(r.height)}`; });

// Quy tắc của pc-ui.css khớp phần tử .most-view-product-img đầu tiên và 3 cấp tổ tiên
const pcRulesOn = () => {
  const e = document.querySelector('.most-view-product-img'); if (!e) return [];
  const sheet = [...document.styleSheets].find((s) => s.href && /pc-ui\.css/.test(s.href)); if (!sheet) return [];
  const hits = []; const walk = (rules) => { for (const r of rules) { if (r.cssRules && !r.selectorText) walk(r.cssRules);
    else if (r.selectorText && !/^\*/.test(r.selectorText)) { let n = e; for (let d = 0; d < 4 && n; d++, n = n.parentElement) { try { if (n.matches(r.selectorText))
      hits.push(`${'^'.repeat(d)}${r.selectorText} { ${r.style.cssText.slice(0, 80)} }`); } catch {} } } } };
  walk(sheet.cssRules); return hits;
};

// % điểm ảnh khác giữa 2 ảnh PNG (so trong trình duyệt bằng canvas)
// Bỏ vùng phần tử nổi tự chuyển động (robot .main-widget + vòng nhấp nháy lan ~9px ngoài khung, .backtop) — 2 ảnh cùng
// bật pc-ui.css chụp cách 150ms cũng khác ở đó (nhiễu, in ra ở cột "nhiễu bật/bật")
const pixelDiff = async (page, a, b, ex = []) => page.evaluate(async ([a, b, ex]) => {
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + src; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  if (ia.width !== ib.width || ia.height !== ib.height) return { pct: 100, n: -1 };
  const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d');
  g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
  g.clearRect(0, 0, c.width, c.height); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
  let n = 0; const box = [1e9, 1e9, -1, -1]; for (let i = 0; i < da.length; i += 4) { const X = (i / 4) % c.width, Y = Math.floor(i / 4 / c.width);
    if (!ex.some(([x0, y0, x1, y1]) => X >= x0 && X <= x1 && Y >= y0 && Y <= y1) && Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 24) {
      n++; box[0] = Math.min(box[0], X); box[1] = Math.min(box[1], Y); box[2] = Math.max(box[2], X); box[3] = Math.max(box[3], Y); } }
  return { n, pct: +(100 * n / (c.width * c.height)).toFixed(3), box: n ? box : null };
}, [a.toString('base64'), b.toString('base64'), ex]);

const out = {};
let totToggle = 0, totD03Deco = 0, totD03Color = 0;
for (const c of CONFIGS) {
  const browser = await (c.b === 'webkit' ? webkit : chromium).launch();
  for (const url of PAGES) {
    const key = `${c.b}-${c.k}|${url}`;
    const ctx = await browser.newContext({ ...c.ctx, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    try { await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 45000 }); } catch { /* kết nối kéo dài — đo sau load */ }
    await page.waitForTimeout(800);
    // (b) so D03 before.json — đo TRƯỚC khi gỡ thanh dev (D03 đo nguyên trang)
    const curD03 = await page.evaluate(D03snap);
    await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
    // (a) bật/tắt
    const tg = await page.evaluate(toggleDiff, LIB);
    if (tg.sheets !== 1) ok(false, `${key} — không tìm thấy đúng 1 styleSheet pc-ui.css (${tg.sheets})`);
    const diffs = tg.diffs;
    totToggle += diffs.length;
    const shotOn = await page.screenshot();
    await page.waitForTimeout(150);
    const shotOn2 = c.k === '1440' ? await page.screenshot() : null;
    await page.evaluate(setPc, false); await page.waitForTimeout(150);
    const shotOff = c.k === '1440' ? await page.screenshot() : null;
    await page.evaluate(setPc, true); await page.waitForTimeout(150);
    const navLink = await page.evaluate(() => [...document.querySelectorAll('a.nav-link')].filter((a) => a.getBoundingClientRect().width > 0)
      .map((a) => getComputedStyle(a).textDecorationLine));
    // (b)
    const b = D03[key]; let d03Deco = null, d03Color = null; const d03Samples = [];
    let d03Pairs = 0;
    if (b?.ids) { d03Deco = 0; d03Color = 0; const pairs = align(b.ids, curD03.map((x) => x.id)); d03Pairs = pairs.length;
      for (const [i, j] of pairs) { const x = b.els[i].split('|'), y = curD03[j].s.split('|');
        if (x[5] === 'none' && y[5] === 'underline') { d03Deco++; if (d03Samples.length < 4) d03Samples.push(b.ids[i]); }
        if (x[3] !== y[3]) d03Color++; } totD03Deco += d03Deco; totD03Color += d03Color; }
    // (d)
    const ex = await page.evaluate(() => [...document.querySelectorAll('.main-widget, .backtop')].map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 0).map((r) => [Math.floor(r.left) - 12, Math.floor(r.top) - 12, Math.ceil(r.right) + 12, Math.ceil(r.bottom) + 12]));
    const pxRaw = shotOff ? await pixelDiff(page, shotOn, shotOff) : null;
    const noise = shotOn2 ? await pixelDiff(page, shotOn, shotOn2) : null;
    const px = shotOff ? { ...(await pixelDiff(page, shotOn, shotOff, ex)), raw: pxRaw.n, noise: noise.n, ex } : null;
    // (e) trang chủ: most-view bật vs chặn hẳn pc-ui.css
    let mv = null;
    if (url === '/') {
      const mvOn = await page.evaluate(mostView); const rules = await page.evaluate(pcRulesOn);
      const p2 = await ctx.newPage();
      await p2.route(/pc-ui\.css/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
      try { await p2.goto(BASE + url, { waitUntil: 'networkidle', timeout: 45000 }); } catch {}
      await p2.waitForTimeout(800);
      const mvOff = await p2.evaluate(mostView);
      await p2.evaluate(() => document.querySelector('.ab-most-view-product-module')?.scrollIntoView());
      await p2.waitForTimeout(400);
      await p2.screenshot({ path: path.join(EVD, `${TAG}-nopcui-${c.b}-${c.k}-mostview.png`) });
      await page.evaluate(() => document.querySelector('.ab-most-view-product-module')?.scrollIntoView());
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(EVD, `${TAG}-${c.b}-${c.k}-mostview.png`) });
      mv = { on: mvOn, off: mvOff, rules };
      await p2.close();
    }
    fs.writeFileSync(path.join(EVD, `${TAG}-${c.b}-${c.k}-${slug(url)}.png`), shotOn);
    out[key] = { toggle: diffs.length, samples: diffs.slice(0, 6), navLink, d03Deco, d03Color, px, mv };
    const navUnder = navLink.filter((d) => d !== 'none').length;
    ok(diffs.length === 0 && navUnder === 0 && d03Deco === 0 && (!px || px.n === 0),
      `${key} — bật/tắt pc-ui.css: ${diffs.length} phần tử cũ đổi gạch chân/màu · a.nav-link hiện ${navLink.length} (gạch chân ${navUnder})`
      + ` · so D03 before: underline mới ${d03Deco ?? '-'}, đổi màu ${d03Color ?? '-'} (căn ${d03Pairs}/${D03[key]?.els.length}→${curD03.length} phần tử)${px ? ` · ảnh 1440 bật/tắt khác ${px.n} điểm (${px.pct}%)${px.box ? ' vùng ' + px.box.join(',') : ''} ngoài vùng widget động ${JSON.stringify(px.ex)} (thô ${px.raw}; nhiễu bật/bật thô ${px.noise})` : ''}`);
    if (diffs.length) console.log('      ' + diffs.slice(0, 6).join(' · '));
    if (d03Samples.length) console.log('      D03 underline mới: ' + d03Samples.join(' · '));
    if (mv) console.log(`      most-view-product-img: bật ${mv.on.join(', ') || '-'} | chặn pc-ui.css ${mv.off.join(', ') || '-'} | quy tắc pc-ui khớp: ${mv.rules.join(' ; ') || 'không'}`);
    await ctx.close();
  }
  await browser.close();
}
fs.writeFileSync(path.join(EVD, `${TAG}.json`), JSON.stringify(out, null, 1));
console.log(`[N02] Tổng: bật/tắt ${totToggle} phần tử cũ đổi · so D03 before: underline mới ${totD03Deco}, đổi màu ${totD03Color}`);
console.log(fail ? `[N02] CHƯA ĐẠT (${fail} mục)` : '[N02] ĐẠT');
process.exit(fail ? 1 : 0);
