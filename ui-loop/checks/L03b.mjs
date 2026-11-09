// L03b (vòng 114, 09/11/2026 — chạy lại: node ui-loop/checks/L03b.mjs before|after).
// Việc tổng L03b, phần còn lại: giá trị settings `fa-…` (configs/settings_data.json) → tên ui_icon; nhãn/mô tả/mặc định schema
// hết hướng dẫn Font Awesome; mặc định Liquid cart_trust_icons (templates/cart.bwt) → tên ui_icon.
// Đo: (a) tĩnh — chuỗi fa- trong settings_data / schema / template, số khoá & số id; (b) 7 khung × (/ + /?tpl=cart có hàng):
// markup SVG từng icon thanh đáy + 4 ô cam kết giỏ, hộp icon, PC-ERROR trong HTML; ảnh vùng thanh đáy / ô cam kết.
// Toàn site (0 request FA, 0 glyph FA) đo bằng `node ui-loop/checks/L03b42.mjs after site`.
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const BASE = 'http://localhost:3000';
const mob = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const FRAMES = [
  ['chromium', '390', chromium, mob(390, 844)],
  ['webkit', 'iphone13', webkit, devices['iPhone 13']],
  ['chromium', '320', chromium, mob(320, 568)],
  ['chromium', '768', chromium, { viewport: { width: 768, height: 1024 } }],
  ['chromium', '1024', chromium, { viewport: { width: 1024, height: 768 } }],
  ['chromium', '1440', chromium, { viewport: { width: 1440, height: 900 } }],
  ['chromium', '844x390', chromium, mob(844, 390)],
];
const PAGES = [['home', '/'], ['cart', '/?tpl=cart']];
let okN = 0; const fails = [];
const ok = (c, m) => { if (c) okN++; else { fails.push(m); console.log('✗ ' + m); } };

// (a) tĩnh
const sd = fs.readFileSync('configs/settings_data.json', 'utf8');
const ss = fs.readFileSync('configs/settings_schema.json', 'utf8');
const sdJ = JSON.parse(sd.replace(/^﻿/, '')); JSON.parse(ss.replace(/^﻿/, ''));
const countKeys = (o) => (o && typeof o === 'object') ? Object.keys(o).length + Object.values(o).reduce((s, v) => s + countKeys(v), 0) : 0;
const st = {
  sdFa: (sd.match(/"[^"]*\bfa-[a-z]/g) || []).length,
  sdKeys: countKeys(sdJ),
  ssFaLines: ss.split('\n').filter((l) => /fa-[a-z]|font ?awesome/i.test(l)).length,
  ssIds: (ss.match(/"id"\s*:/g) || []).length,
  tplFaClass: 0, cartDefault: (fs.readFileSync('templates/cart.bwt', 'utf8').match(/cart_trust_icons \| default: '([^']*)'/) || [])[1],
};
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
for (const f of ['templates', 'snippets', 'layouts'].flatMap(walk).filter((f) => f.endsWith('.bwt')))
  st.tplFaClass += (fs.readFileSync(f, 'utf8').match(/class="[^"]*\bfa-(solid|regular|brands)\b/g) || []).length;
console.log('tĩnh:', JSON.stringify(st));
const beforeFile = `${OUT}/before.json`;
const before = MODE === 'after' ? JSON.parse(fs.readFileSync(beforeFile, 'utf8')) : null;
if (MODE === 'after') {
  ok(st.sdFa === 0, `settings_data 0 giá trị fa- (${st.sdFa})`);
  ok(st.sdKeys === before.static.sdKeys, `settings_data số khoá ${before.static.sdKeys} → ${st.sdKeys}`);
  ok(st.ssFaLines === 0, `schema 0 dòng nhắc FA (${st.ssFaLines})`);
  ok(st.ssIds === before.static.ssIds, `schema số id ${before.static.ssIds} → ${st.ssIds}`);
  ok(st.tplFaClass === 0, `template 0 class fa-solid/regular/brands (${st.tplFaClass})`);
  ok(!/fa-/.test(st.cartDefault || ''), `cart.bwt mặc định cart_trust_icons = ${st.cartDefault}`);
}

const measure = (p) => p.evaluate(() => {
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const vis = (el) => { const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return r.width > 0 && r.height > 0 && c.display !== 'none' && c.visibility !== 'hidden'; };
  const pick = (sel) => [...document.querySelectorAll(sel)].map((it) => {
    const svg = it.querySelector('svg'); const r = svg ? svg.getBoundingClientRect() : null;
    return { label: norm(it.textContent).slice(0, 30), svg: svg ? norm(svg.outerHTML) : null, w: r ? +r.width.toFixed(1) : 0, h: r ? +r.height.toFixed(1) : 0, vis: svg ? vis(svg) : false, color: svg ? getComputedStyle(svg).color : null };
  });
  return {
    nav: pick('.pc-bottom-nav__item'), trust: pick('.cart-trust-item'),
    pcError: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length,
    navVisible: !!document.querySelector('.pc-bottom-nav') && vis(document.querySelector('.pc-bottom-nav')),
  };
});

const data = { static: st, pages: {} };
for (const [brn, fr, eng, opt] of FRAMES) {
  const browser = await eng.launch();
  const ctx = await browser.newContext(opt);
  for (const v of ['10021', '10011']) await ctx.request.post(BASE + '/cart/add.js', { form: { variantId: v, quantity: '1' } });
  for (const [pk, url] of PAGES) {
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 80)));
    await p.goto(BASE + url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
    await p.waitForSelector('.pc-bottom-nav', { state: 'attached', timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(600);
    const m = await measure(p); m.jsErr = errs.length;
    const key = `${brn}-${fr}-${pk}`; data.pages[key] = m;
    // Thanh công cụ preview (#dev-toolbar, chỉ có ở local) nằm đè thanh đáy ⇒ ẩn khi CHỤP ẢNH (đo đã xong ở trên).
    await p.evaluate(() => { const d = document.getElementById('dev-toolbar'); if (d) d.style.display = 'none'; });
    console.log(`${key}: nav ${m.nav.length} icon (nhìn thấy ${m.navVisible}) [${m.nav.map((n) => `${n.label}:${n.w}×${n.h}`).join(', ')}] · trust ${m.trust.length} [${m.trust.map((n) => `${n.w}×${n.h}`).join(', ')}] · PC-ERROR ${m.pcError} · lỗi JS ${m.jsErr}`);
    if (m.navVisible) { const nav = p.locator('.pc-bottom-nav').first(); await nav.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pk}-nav.png` }).catch(() => {}); }
    if (pk === 'cart' && m.trust.length) { const t = p.locator('.cart-trust-grid').first(); await t.scrollIntoViewIfNeeded().catch(() => {}); await t.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pk}-trust.png` }).catch(() => {}); }
    if (MODE === 'after') {
      const b = before.pages[key];
      ok(m.pcError === 0, `${key}: PC-ERROR ${m.pcError}`);
      ok(m.nav.length === b.nav.length && m.trust.length === b.trust.length, `${key}: số icon nav ${b.nav.length}→${m.nav.length}, trust ${b.trust.length}→${m.trust.length}`);
      m.nav.forEach((n, i) => { ok(n.svg === b.nav[i].svg, `${key}: nav «${n.label}» SVG trùng before`); ok(n.w === b.nav[i].w && n.h === b.nav[i].h && n.vis === b.nav[i].vis, `${key}: nav «${n.label}» hộp ${b.nav[i].w}×${b.nav[i].h} → ${n.w}×${n.h}`); });
      m.trust.forEach((n, i) => { ok(n.svg === b.trust[i].svg, `${key}: trust «${n.label}» SVG trùng before`); ok(n.w === b.trust[i].w && n.h === b.trust[i].h && n.vis && n.w > 0, `${key}: trust «${n.label}» hộp ${b.trust[i].w}×${b.trust[i].h} → ${n.w}×${n.h}`); });
      if (pk === 'cart') ok(m.trust.length === 4, `${key}: 4 ô cam kết (${m.trust.length})`);
      ok(m.jsErr <= b.jsErr, `${key}: lỗi JS ${b.jsErr} → ${m.jsErr}`);
    }
    await p.close();
  }
  await browser.close();
}
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify(data, null, 1));
console.log(`${MODE}: ${okN} ✔ / ${fails.length} ✗`);
