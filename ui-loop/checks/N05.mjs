#!/usr/bin/env node
/*
  ui-loop/checks/N05.mjs — kiểm việc N05: phần tử nổi CŨ (thanh đáy `.pc-bottom-nav`, robot `.main-widget`, nút lên đầu
  `.backtop`, thông báo giỏ `#popup-cart-mobile`) không được đè phần tử nổi của thư viện (`.pc-actionbar`, `.pc-modal`,
  `.pc-fab`, `.pc-toast`).
  Trang kit /?tpl=page.ui-kit ở 8 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13 / 1440), cuộn giữa + cuối:
    (a) 3×3 điểm elementFromPoint trên nút + giá thanh mua trúng chính nó; (b) popup mở: 5×5 điểm trong .pc-modal trúng popup;
    (c) tâm .pc-fab trúng nó, số nút nổi đang hiện ≤ 1; (d) .pc-toast giao thanh mua 0px (< 1024); (e) axe target-size #pc-kit = 0.
  Hồi quy: 6 trang Q × Chromium 390/1440 + WebKit 390 — display / rect của phần tử nổi cũ so lần chạy `--before`.
  Chạy: node ui-loop/checks/N05.mjs [--before]   (cần npm run preview ở localhost:3000)
*/
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVD = path.join(ROOT, 'ui-loop', 'evidence', 'N05');
const BASE = 'http://localhost:3000';
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BEFORE = process.argv.includes('--before');
const tag = BEFORE ? 'before' : 'after';
fs.mkdirSync(EVD, { recursive: true });
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✗ ') + msg); if (!cond) fail++; };

const FRAMES = [
  { name: 'chromium-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'webkit-390', engine: webkit, opts: { ...devices['iPhone 13'] } },
  { name: 'chromium-320', engine: chromium, opts: { viewport: { width: 320, height: 568 } } },
  { name: 'chromium-768', engine: chromium, opts: { viewport: { width: 768, height: 1024 } } },
  { name: 'chromium-1024', engine: chromium, opts: { viewport: { width: 1024, height: 768 } } },
  { name: 'chromium-1440', engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'webkit-1440', engine: webkit, opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'chromium-844x390', engine: chromium, opts: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
];
const Q = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/dat-lich-tu-van', '/?tpl=login'];
const LEGACY = ['.pc-bottom-nav', '.main-widget', '.backtop', '#popup-cart-mobile'];

const browsers = {};
const open = async (f, url) => {
  const b = browsers[f.engine.name()] ||= await f.engine.launch();
  const ctx = await b.newContext({ ...f.opts, reducedMotion: 'reduce' }); const page = await ctx.newPage();
  const res = await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  return { ctx, page, status: res.status() };
};
const axeTarget = (page) => page.evaluate(async () => (await window.axe.run({ include: [['#pc-kit']] }, {
  runOnly: { type: 'rule', values: ['target-size'] }, resultTypes: ['violations'],
})).violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))));

// Đo trong trang: điểm thử phủ, toast/thanh mua, nút nổi đang hiện
const measure = () => {
  const vis = (e) => { if (!e) return false; const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05 && r.width > 0 && r.height > 0
      && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const who = (e) => { if (!e) return 'null'; const p = e.closest('.pc-bottom-nav, .main-widget, .backtop, #popup-cart-mobile, .pc-toast, .pc-fab, .pc-actionbar, .pc-modal, .pc-overlay');
    return p ? (p.id ? '#' + p.id : '.' + [...p.classList][0]) : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''); };
  // lề 8px: góc bo 12px (pc-btn rounded-xl) không tính là "bị che"; legacyOnly ⇒ chỉ phần tử nổi CŨ tính là che
  const LEG = /^(\.pc-bottom-nav|\.main-widget|\.backtop|#popup-cart-mobile)$/;
  const grid = (el, n, legacyOnly) => { const r = el.getBoundingClientRect(); const pts = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = r.left + 8 + (r.width - 16) * (n === 1 ? .5 : i / (n - 1)); const y = r.top + 8 + (r.height - 16) * (n === 1 ? .5 : j / (n - 1));
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const hit = document.elementFromPoint(x, y); const by = who(hit);
      pts.push({ ok: (!!hit && el.contains(hit)) || (!!legacyOnly && !LEG.test(by)), by }); }
    return { total: pts.length, hit: pts.filter((p) => p.ok).length, blockers: [...new Set(pts.filter((p) => !p.ok).map((p) => p.by))] }; };
  const ab = document.querySelector('.pc-actionbar'); const abBtn = ab?.querySelector('.pc-btn'); const abPrice = ab?.querySelector('.pc-actionbar__price');
  const abFixed = ab && getComputedStyle(ab).position === 'fixed';
  const toast = document.querySelector('.pc-toast'); const fab = document.querySelector('.pc-fab');
  const inter = (a, b) => { const r1 = a.getBoundingClientRect(); const r2 = b.getBoundingClientRect();
    const w = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left); const h = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
    return w > 0 && h > 0 ? Math.round(h * 10) / 10 : 0; };
  const floats = [['.pc-fab', fab], ['.main-widget', document.querySelector('.main-widget')], ['.backtop', document.querySelector('.backtop.show')]]
    .filter(([, e]) => vis(e)).map(([n]) => n);
  const legacy = ['.pc-bottom-nav', '.main-widget', '.backtop', '#popup-cart-mobile'].map((s) => { const e = document.querySelector(s); if (!e) return [s, null];
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return [s, { display: cs.display, vis: vis(e), z: cs.zIndex, top: Math.round(r.top), h: Math.round(r.height) }]; });
  return {
    abFixed, abH: ab ? Math.round(ab.getBoundingClientRect().height * 10) / 10 : 0, abTop: ab ? Math.round(ab.getBoundingClientRect().top) : null,
    btn: abBtn && vis(abBtn) ? grid(abBtn, 3) : null, price: abPrice && vis(abPrice) ? grid(abPrice, 3) : null,
    toastVis: vis(toast), toastTop: toast ? Math.round(toast.getBoundingClientRect().top) : null, toastBottom: toast ? Math.round(toast.getBoundingClientRect().bottom) : null,
    toastOverlapPx: toast && ab && abFixed && vis(toast) ? inter(toast, ab) : 0, toastHit: vis(toast) ? grid(toast, 3) : null,
    fabVis: vis(fab), fabHit: vis(fab) ? grid(fab, 1, true) : null, floats, legacy: Object.fromEntries(legacy),
  };
};
const modalMeasure = () => {
  const m = document.getElementById('kit-modal'); const r = m.getBoundingClientRect(); const pts = []; const n = 5;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    // lề 12px (góc bo 16px của khung trượt); chỉ phần tử nổi CŨ tính là che — toast thư viện z 60 > popup z 55 theo thang B.2
    const x = r.left + 12 + (r.width - 24) * i / (n - 1); const y = Math.max(r.top, 0) + 12 + (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0) - 24) * j / (n - 1);
    const hit = document.elementFromPoint(x, y);
    const p = hit && hit.closest('.pc-bottom-nav, .main-widget, .backtop, #popup-cart-mobile');
    pts.push({ ok: !p, by: p ? (p.id ? '#' + p.id : '.' + [...p.classList][0]) : (hit ? hit.tagName.toLowerCase() : 'null') }); }
  return { total: pts.length, hit: pts.filter((p) => p.ok).length, blockers: [...new Set(pts.filter((p) => !p.ok).map((p) => p.by))] };
};

const out = { kit: {}, legacy: {} };
// --legacy-only: chỉ chạy phần hồi quy (đối chứng với pc-ui.css của HEAD)
const LEGACY_ONLY = process.argv.includes('--legacy-only');
// 1) Trang kit
for (const f of LEGACY_ONLY ? [] : FRAMES) {
  console.log(`\n[N05] kit ${f.name}`);
  const { ctx, page, status } = await open(f, '/?tpl=page.ui-kit');
  ok(status === 200, `HTTP ${status}`);
  await page.addScriptTag({ content: AXE_SRC });
  const mobile = f.opts.viewport ? f.opts.viewport.width < 1024 : true;
  const rec = { scroll: {} };
  for (const pos of ['mid', 'end']) {
    await page.evaluate((p) => window.scrollTo(0, p === 'mid' ? document.documentElement.scrollHeight / 2 - innerHeight / 2 : document.documentElement.scrollHeight), pos);
    if (pos === 'end' && !mobile) await page.evaluate(() => document.querySelector('.pc-actionbar').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const m = await page.evaluate(measure); rec.scroll[pos] = m;
    console.log(`  · ${pos}: thanh mua ${m.abFixed ? 'fixed' : 'tĩnh'} cao ${m.abH}px top ${m.abTop}; toast ${m.toastTop}–${m.toastBottom}; nút nổi ${m.floats.join(', ') || '—'}`);
    if (m.btn) ok(BEFORE || m.btn.hit === m.btn.total, `${pos}: nút thanh mua trúng ${m.btn.hit}/${m.btn.total}${m.btn.blockers.length ? ' — bị che bởi ' + m.btn.blockers.join(', ') : ''}`);
    else if (m.abFixed) ok(BEFORE, `${pos}: nút thanh mua không nhìn thấy`);
    if (m.price) ok(BEFORE || m.price.hit === m.price.total, `${pos}: giá thanh mua trúng ${m.price.hit}/${m.price.total}${m.price.blockers.length ? ' — bị che bởi ' + m.price.blockers.join(', ') : ''}`);
    if (m.abFixed) ok(BEFORE || m.toastOverlapPx === 0, `${pos}: toast giao thanh mua ${m.toastOverlapPx}px`);
    if (m.abFixed) ok(BEFORE || m.abH <= 80, `${pos}: thanh mua cao ${m.abH}px (≤ 80 = đáy toast bottom-20)`);
    if (m.toastHit) ok(BEFORE || m.toastHit.hit === m.toastHit.total, `${pos}: toast trúng ${m.toastHit.hit}/${m.toastHit.total}${m.toastHit.blockers.length ? ' — bị che bởi ' + m.toastHit.blockers.join(', ') : ''}`);
    if (m.fabHit) ok(BEFORE || m.fabHit.hit === m.fabHit.total, `${pos}: tâm .pc-fab trúng ${m.fabHit.hit}/${m.fabHit.total}${m.fabHit.blockers.length ? ' — bị che bởi ' + m.fabHit.blockers.join(', ') : ''}`);
    ok(BEFORE || m.floats.length <= 1, `${pos}: nút nổi đang hiện ${m.floats.length} (${m.floats.join(', ') || '—'})`);
    if (pos === 'mid') await page.screenshot({ path: path.join(EVD, `${tag}-${f.name}.png`) });
  }
  const ax1 = await axeTarget(page);
  ok(BEFORE || ax1.length === 0, `axe target-size #pc-kit: ${ax1.length}${ax1.length ? ' — ' + ax1.join(' ; ') : ''}`);
  // Popup: JS mở/đóng là D05 ⇒ mở bằng cách bỏ hidden
  await page.evaluate(() => { document.getElementById('kit-modal').hidden = false; document.querySelector('[data-pc-modal-overlay="kit-modal"]').hidden = false; });
  await page.waitForTimeout(300);
  const mm = await page.evaluate(modalMeasure);
  ok(BEFORE || mm.hit === mm.total, `popup mở: điểm trúng popup ${mm.hit}/${mm.total}${mm.blockers.length ? ' — bị che bởi ' + mm.blockers.join(', ') : ''}`);
  const ax2 = await axeTarget(page);
  ok(BEFORE || ax2.length === 0, `axe target-size #pc-kit (popup mở): ${ax2.length}${ax2.length ? ' — ' + ax2.join(' ; ') : ''}`);
  await page.screenshot({ path: path.join(EVD, `${tag}-${f.name}-modal.png`) });
  // Trang KHÔNG có thanh mua / nút nổi (vd popup lọc, voucher): gỡ 2 phần tử đó khỏi DOM rồi đo lại popup
  await page.evaluate(() => document.querySelectorAll('.pc-actionbar, .pc-fab').forEach((e) => e.remove()));
  await page.waitForTimeout(300);
  const mm2 = await page.evaluate(modalMeasure);
  ok(BEFORE || mm2.hit === mm2.total, `popup mở (trang không thanh mua / nút nổi): ${mm2.hit}/${mm2.total}${mm2.blockers.length ? ' — bị che bởi ' + mm2.blockers.join(', ') : ''}`);
  await page.screenshot({ path: path.join(EVD, `${tag}-${f.name}-modal-noab.png`) });
  Object.assign(rec, { axe: ax1, axeModal: ax2, modal: mm, modalNoAb: mm2 });
  out.kit[f.name] = rec;
  await ctx.close();
}

// 2) Hồi quy: phần tử nổi cũ trên 6 trang Q (không có pc-*) phải giữ nguyên
for (const f of FRAMES.filter((x) => ['chromium-390', 'chromium-1440', 'webkit-390'].includes(x.name))) {
  for (const url of Q) {
    const { ctx, page } = await open(f, url);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    // chờ 2s: .backtop tự ẩn 1,4s sau khi ngừng cuộn (main.js awe_backtotop) — đo ở trạng thái đã ổn định, lặp lại được
    await page.waitForTimeout(2000);
    out.legacy[`${f.name} ${url}`] = (await page.evaluate(measure)).legacy;
    await ctx.close();
  }
}
for (const b of Object.values(browsers)) await b.close();
fs.writeFileSync(path.join(EVD, `${LEGACY_ONLY ? tag + '-legacy-only' : tag}.json`), JSON.stringify(out, null, 1));

if (!BEFORE) {
  // Mốc so: control-head.json (cùng script, --legacy-only, assets/pc-ui.css của HEAD 0a61958) nếu có; không thì before.json.
  // .backtop tự ẩn 1,4s sau khi ngừng cuộn (main.js) ⇒ lần chạy --before lúc đầu bắt được trạng thái đang hiện — không lặp lại được.
  const ref = fs.existsSync(path.join(EVD, 'control-head.json')) ? 'control-head.json' : 'before.json';
  console.log(`  · hồi quy so với ${ref}`);
  const before = JSON.parse(fs.readFileSync(path.join(EVD, ref), 'utf8'));
  let diff = 0; let n = 0;
  for (const [k, v] of Object.entries(out.legacy)) for (const s of LEGACY) {
    n++; const a = JSON.stringify(before.legacy[k]?.[s]); const b = JSON.stringify(v[s]);
    if (a !== b) { diff++; console.log(`  ✗ hồi quy ${k} ${s}: ${a} → ${b}`); }
  }
  ok(diff === 0, `hồi quy phần tử nổi cũ trên Q: ${diff}/${n} đổi`);
}
console.log(`\n[N05] ${BEFORE ? 'đo trước sửa xong' : fail ? `CHƯA ĐẠT — ${fail} mục ✗` : 'ĐẠT'}`);
process.exit(BEFORE ? 0 : fail ? 1 : 0);
