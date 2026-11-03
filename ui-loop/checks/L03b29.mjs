// L03b29 (vòng 95, 03/11/2026 — chạy lại: node ui-loop/checks/L03b29.mjs before|after [khung,khung]).
// Việc: gỡ Font Awesome (fa-youtube) ở icon video trên ảnh thẻ SP của 2 template mảnh:
//   templates/product.viewed.bwt  — khối «Sản phẩm đã xem» (snippets/section_product_viewed.bwt nạp /<alias>?view=viewed
//                                    theo localStorage last_viewed_products) — dựng thật trên /collections/all;
//   templates/product.favorite.bwt — mảnh /products/<alias>?view=favorite (favorite_js chỉ chèn khi template page.favorite,
//                                    theme chưa có template đó) ⇒ tải đúng mảnh bằng fetch, chèn vào cùng khối để có CSS thật.
// SP demo /products/demo-l03b28-trang-sp có tag video: ⇒ tag_check_video = true ⇒ có .video_tem.
// Ảnh: ui-loop/evidence/L03b29/<mode>-<trình duyệt>-<khung>-<viewed|favorite>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b29';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const BASE = 'http://localhost:3000';
const PAGE = '/collections/all';
const ALIAS = 'demo-l03b28-trang-sp';
const mob = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const FRAMES = [
  ['chromium', '390', chromium, mob(390, 844)],
  ['webkit', 'iphone13', webkit, devices['iPhone 13']],
  ['chromium', '1440', chromium, { viewport: { width: 1440, height: 900 } }],
  ['chromium', '320', chromium, mob(320, 568)],
  ['chromium', '768', chromium, { viewport: { width: 768, height: 1024 } }],
  ['chromium', '1024', chromium, { viewport: { width: 1024, height: 768 } }],
  ['chromium', '844x390', chromium, mob(844, 390)],
].filter(([, fr]) => !process.argv[3] || process.argv[3].split(',').includes(fr));
const before = MODE === 'after' && fs.existsSync(`${OUT}/before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/before.json`, 'utf8')) : null;
const data = {}; const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✗'} ${msg}`); if (!cond) fails.push(msg); };

// Đo icon trong .product-thumbnail (glyph FA đo bằng span ẩn cùng font/ký tự ::before — như L03b8–L03b28).
const measure = (p, scope) => p.evaluate((scope) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0'; };
  const root = document.querySelector(scope); if (!root) return null;
  const out = []; let fa = 0;
  const box = root.getBoundingClientRect();
  for (const i of root.querySelectorAll('.video_tem i')) {
    const isFa = /(^|\s)fa-/.test(i.className); if (isFa) fa++;
    const svg = i.querySelector(':scope > svg');
    if (!isFa && !svg) continue;
    const t = svg || i; let r = t.getBoundingClientRect();
    if (isFa) { const c = getComputedStyle(i); const cb = getComputedStyle(i, '::before'); const fs = parseFloat(cb.fontSize || c.fontSize);
      const s = document.createElement('span'); s.textContent = (cb.content || '').replace(/^"|"$/g, '');
      s.style.cssText = `position:absolute;left:-9999px;top:0;font-family:${cb.fontFamily};font-weight:${cb.fontWeight};font-size:${cb.fontSize};line-height:1;white-space:nowrap`;
      document.body.appendChild(s); const gw = s.getBoundingClientRect().width || r.width; s.remove();
      r = { x: r.x + (r.width - gw) / 2, y: r.y + (r.height - fs) / 2, width: gw, height: fs }; }
    out.push({ vis: vis(t) && vis(i), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      rx: +(r.x + r.width / 2 - box.x).toFixed(1), ry: +(r.y + r.height / 2 - box.y).toFixed(1),
      color: getComputedStyle(t).color, fill: svg ? getComputedStyle(svg).fill : null });
  }
  const card = root.closest('.item_product_main') || root; const cr = card.getBoundingClientRect();
  return { icons: out, fa, bw: +box.width.toFixed(1), bh: +box.height.toFixed(1), cw: +cr.width.toFixed(1), ch: +cr.height.toFixed(1) };
}, scope);

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const compare = (key, bm, m) => {
  if (!bm || !m) { ok(false, `${key}: có số đo before + after (${!!bm}/${!!m})`); return; }
  const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
  ok(av.length === 1 && bv.length === 1, `${key}: icon youtube nhìn thấy before ${bv.length} → after ${av.length}`);
  ok(m.fa === 0, `${key}: <i fa-> trong thẻ = ${m.fa}`);
  const x = bv[0] || {}, y = av[0] || {};
  const dc = Math.hypot(x.rx - y.rx, x.ry - y.ry);
  const ds = Math.abs(x.h - y.h); // cao; rộng glyph FA youtube 1,125em vs SVG 1em — chỉ in ra
  const a = rgb(x.color || ''), b = rgb(y.fill && y.fill !== 'none' ? y.fill : (y.color || '')); const cd = Math.max(...a.map((v, k) => Math.abs(v - b[k])));
  const cardD = Math.max(Math.abs(bm.cw - m.cw), Math.abs(bm.ch - m.ch), Math.abs(bm.bw - m.bw), Math.abs(bm.bh - m.bh));
  console.log(`      ${x.w}×${x.h} @${x.rx},${x.ry} ${x.color} → ${y.w}×${y.h} @${y.rx},${y.ry} màu ${y.color} fill ${y.fill} · thẻ ${bm.cw}×${bm.ch} → ${m.cw}×${m.ch}`);
  ok(dc <= 2, `${key}: lệch tâm icon ≤ 2px (đo ${dc.toFixed(1)})`);
  ok(ds <= 2, `${key}: cao icon lệch ≤ 2px (đo ${ds.toFixed(1)})`);
  ok(cd <= 10, `${key}: màu icon ΔRGB ≤ 10 (đo ${cd})`);
  ok(cardD <= 1, `${key}: thẻ/ảnh SP đổi cỡ ≤ 1px (đo ${cardD.toFixed(1)})`);
};

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  const key = `${brn}-${fr}`;
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  await ctx.addInitScript((alias) => { try { localStorage.setItem('last_viewed_products', JSON.stringify([{ alias }])); } catch (e) {} }, ALIAS);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.goto(BASE + PAGE, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForSelector('.swiper_viewed .video_tem', { timeout: 15000 }).catch(() => {});
  // Mảnh favorite: tải đúng URL favorite_js dùng, chèn dưới khối «Đã xem».
  await p.evaluate(async (alias) => {
    const html = await (await fetch(`/products/${alias}?view=favorite`)).text();
    const host = document.querySelector('.section-recenview-product .container') || document.body;
    const w = document.createElement('div'); w.id = 'l03b29-fav'; w.className = 'row'; w.innerHTML = html; host.appendChild(w);
  }, ALIAS);
  await p.evaluate(async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
  await p.waitForTimeout(1200);
  const m = {};
  m.viewedShown = await p.evaluate(() => { const e = document.querySelector('.section-recenview-product'); return !!e && !e.classList.contains('d-none') && e.getBoundingClientRect().height > 0; });
  m.pcErr = await p.evaluate(() => (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length);
  m.viewed = await measure(p, '.swiper_viewed .product-thumbnail');
  m.favorite = await measure(p, '#l03b29-fav .product-thumbnail');
  for (const [k, sel] of [['viewed', '.swiper_viewed .item_product_main'], ['favorite', '#l03b29-fav .item_product_main']]) {
    const loc = p.locator(sel).first();
    if (await loc.count()) { await loc.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(300); await loc.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${k}.png` }).catch(() => {}); }
  }
  // Bàn phím: Tab vào link ảnh thẻ «Đã xem» rồi Tab / Shift+Tab — focus quay lại đúng link.
  m.kbd = await p.evaluate(() => { const a = document.querySelector('.swiper_viewed a.image_thumb'); if (!a) return null; a.focus(); return document.activeElement === a; });
  if (m.kbd) { await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab'); m.kbdBack = await p.evaluate(() => document.activeElement?.matches('.swiper_viewed a.image_thumb')); }
  m.errs = errs;
  data[key] = m;
  console.log(`\n== ${key}: khối Đã xem hiện ${m.viewedShown} · PC-ERROR ${m.pcErr} · lỗi JS ${errs.length} · Tab/Shift+Tab về link ${m.kbdBack}`);
  for (const k of ['viewed', 'favorite']) {
    const v = m[k]; console.log(`   ${k}: ${v ? `FA ${v.fa}, icon ${v.icons.map((i) => `${i.w}×${i.h}@${i.rx},${i.ry} ${i.color}${i.fill ? ' fill ' + i.fill : ''} vis ${i.vis}`).join(' ')}, thẻ ${v.cw}×${v.ch}` : 'không có'}`);
  }
  if (before) {
    const bm = before[key];
    if (!bm) { ok(false, `${key}: có before`); } else {
      ok(m.viewedShown === bm.viewedShown && m.viewedShown, `${key}: khối «Đã xem» hiện = before (${bm.viewedShown} → ${m.viewedShown})`);
      ok(m.pcErr === 0, `${key}: PC-ERROR ui_icon = ${m.pcErr}`);
      ok(errs.length <= bm.errs.length, `${key}: lỗi JS ${bm.errs.length} → ${errs.length}`);
      ok(m.kbdBack === bm.kbdBack, `${key}: Tab/Shift+Tab = before (${bm.kbdBack} → ${m.kbdBack})`);
      compare(`${key} viewed`, bm.viewed, m.viewed);
      compare(`${key} favorite`, bm.favorite, m.favorite);
    }
  }
  await b.close();
}
if (MODE === 'before') fs.writeFileSync(`${OUT}/before.json`, JSON.stringify(data, null, 1));
else fs.writeFileSync(`${OUT}/after.json`, JSON.stringify(data, null, 1));
const total = fs.readFileSync(LOG, 'utf8').split('\n').filter((l) => /^[✔✗]/.test(l));
console.log(`\nTỔNG: ${total.filter((l) => l[0] === '✔').length} ✔ / ${fails.length} ✗`);
process.exit(fails.length ? 1 : 0);
