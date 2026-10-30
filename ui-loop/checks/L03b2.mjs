// L03b2 (vòng 44, 30/10/2026 — chạy lại: node ui-loop/checks/L03b2.mjs before|after).
// Việc: gỡ Font Awesome ở THẺ SẢN PHẨM (product_card_collection, product_grid_office[_sale]) + DẢI VOUCHER / MÃ GIẢM GIÁ
// (collection_vouchers, coupon_products) + QUICKVIEW (quickview-template, quickview-buy) — thay bằng ui_icon size 'em'.
// Tiêu chí (BACKLOG L03b2): 7 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13) × 4 trang:
//   · 0 thẻ <i class="fa-…"> trong vùng; 0 "PC-ERROR ui_icon";
//   · icon nhìn thấy after ≥ before; lệch tâm trong phần tử cha ≤ 4px; phần tử cha đổi cỡ ≤ 4px; cao icon 60–160 %;
//     icon nét không bị CSS cũ tô đặc (trừ biến thể tô đặc có chủ đích: path fill="currentColor");
//   · bấm tim thẻ SP đầu: aria-pressed false → true, tim đặc hiện + tim rỗng ẩn, bấm lại → ngược lại;
//   · bấm (i) điều kiện voucher ⇒ popup mở, nút đóng có icon nhìn thấy, bấm đóng ⇒ popup ẩn; 0 lỗi JS mới.
// Ảnh: ui-loop/evidence/L03b2/<mode>-<trình duyệt>-<khung>-<trang>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b2';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const PAGES = [['coll', '/collections/all'], ['home', '/?tpl=index'], ['pdp', '/products/serum-vitamin-c-15'], ['search', '/search?query=serum']];
const ZONES = '.pc-pcard, .item_product_main, .pc-vouchers, .popup-coupon, .product-coupon__wrapper, #modal-coupon-product, #quick-view-product';
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
const before = MODE === 'after' && fs.existsSync(`${OUT}/before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/before.json`, 'utf8')) : null;
const data = {}; const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✗'} ${msg}`); if (!cond) fails.push(msg); };

const measure = (p) => p.evaluate((zones) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.() !== false; };
  const out = []; let fa = 0; const seen = new Set();
  for (const z of document.querySelectorAll(zones)) {
    for (const i of z.querySelectorAll('i')) {
      if (seen.has(i)) continue; seen.add(i);
      const isFa = /(^|\s)fa-/.test(i.className); if (isFa) fa++;
      const svg = i.querySelector(':scope > svg');
      if (!isFa && !svg) continue;
      const t = svg || i; const r = t.getBoundingClientRect(); const pr = i.parentElement.getBoundingClientRect();
      const intended = svg ? !!svg.querySelector('[fill="currentColor"]') : false;
      const filled = svg && !intended ? [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon')].filter((e) => getComputedStyle(e).fill !== 'none').length : 0;
      const zc = (z.className && typeof z.className === 'string' ? z.className.split(' ')[0] : z.id || z.tagName.toLowerCase());
      out.push({ zone: zc, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*/g, '').trim(), vis: vis(t) && vis(i),
        x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2 + scrollY), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
        filled, intended, color: getComputedStyle(t).color });
    }
  }
  return { icons: out, fa, docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length };
}, ZONES);

const compare = (key, label, bm, m) => {
  const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
  ok(av.length >= bv.length, `${key} ${label}: icon nhìn thấy before ${bv.length} → after ${av.length}`);
  let worst = 0, worstK = '', minR = 9, maxR = 0, parD = 0, parK = '';
  bv.forEach((x, i) => { const y = av[i]; if (!y) return;
    const d = Math.hypot(x.rx - y.rx, x.ry - y.ry); if (d > worst) { worst = d; worstK = x.zone + ' ' + x.cls; }
    const pd = Math.max(Math.abs(x.pw - y.pw), Math.abs(x.ph - y.ph)); if (pd > parD) { parD = pd; parK = x.zone + ' ' + x.cls; }
    const rr = (y.h || 0.01) / (x.h || 0.01); minR = Math.min(minR, rr); maxR = Math.max(maxR, rr); });
  const fill = av.filter((y) => y.filled).map((y) => y.zone + ' ' + y.cls);
  console.log(`   ${key} ${label}: lệch tâm lớn nhất ${worst.toFixed(1)}px (${worstK}) · đổi cỡ phần tử cha lớn nhất ${parD.toFixed(1)}px (${parK}) · tỉ lệ cao icon ${minR.toFixed(2)}–${maxR.toFixed(2)} · cao trang ${bm.docH} → ${m.docH}`);
  ok(worst <= 4 || bv.length === 0, `${key} ${label}: lệch tâm icon trong phần tử cha ≤ 4px (đo ${worst.toFixed(1)})`);
  ok(parD <= 4 || bv.length === 0, `${key} ${label}: cỡ phần tử chứa icon đổi ≤ 4px (đo ${parD.toFixed(1)})`);
  ok(bv.length === 0 || (minR >= 0.6 && maxR <= 1.6), `${key} ${label}: cỡ icon 60–160 % before (${minR.toFixed(2)}–${maxR.toFixed(2)})`);
  ok(fill.length === 0, `${key} ${label}: icon nét bị CSS cũ tô đặc = ${fill.length}${fill.length ? ' — ' + fill.slice(0, 3).join(', ') : ''}`);
};

const prep = async (p, path) => {
  await p.goto(BASE + path, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove()); // thanh công cụ preview (dev-server), không thuộc theme
  await p.waitForTimeout(800);
};

for (const [brn, fr, br, opt] of FRAMES) {
  const key = `${brn}-${fr}`;
  const b = await br.launch();
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  for (const [pk, path] of PAGES) {
    await prep(p, path);
    // cuộn hết trang để ảnh lazy + khối chèn bằng JS hiện ra, rồi về đầu
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await p.waitForTimeout(400);
    const m = await measure(p);
    data[`${key}|${pk}`] = m;
    const visN = m.icons.filter((x) => x.vis).length;
    if (MODE === 'after') {
      ok(m.fa === 0, `${key} ${pk}: <i fa-> trong vùng = ${m.fa}`);
      ok(m.pcErr === 0, `${key} ${pk}: PC-ERROR ui_icon = ${m.pcErr}`);
      const bm = before?.[`${key}|${pk}`]; if (bm) compare(key, pk, bm, m);
    } else console.log(`${key} ${pk}: icon FA ${m.fa} · nhìn thấy ${visN}`);
    await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pk}.png` });

    if (pk === 'coll') {
      // ảnh cận thẻ SP đầu + dải voucher
      const card = p.locator('.pc-pcard').first();
      if (await card.count()) { await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await card.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-card.png` }); }
      const vc = p.locator('.pc-vouchers').first();
      if (await vc.count() && await vc.isVisible()) { await vc.scrollIntoViewIfNeeded(); await vc.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-vouchers.png` }); }
      // (c) tim yêu thích: bấm 2 lần
      const wish = p.locator('.pc-pcard__wish').first();
      if (await wish.count() && await wish.isVisible()) {
        const st = () => wish.evaluate((bt) => ({ pressed: bt.getAttribute('aria-pressed'),
          shown: [...bt.querySelectorAll(':scope > i')].filter((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(i).display !== 'none'; })
            .map((i) => ({ cls: i.className, solidSvg: !!i.querySelector('[fill="currentColor"]'), color: getComputedStyle(i).color })) }));
        const s0 = await st(); await wish.click(); await p.waitForTimeout(400); const s1 = await st();
        await wish.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-wish-on.png` });
        await wish.click(); await p.waitForTimeout(400); const s2 = await st();
        console.log(`   ${key} tim: ${JSON.stringify(s0)} → ${JSON.stringify(s1)} → ${JSON.stringify(s2)}`);
        data[`${key}|wish`] = [s0, s1, s2];
        if (MODE === 'after') {
          const bw = before?.[`${key}|wish`];
          ok(s0.pressed === 'false' && s0.shown.length === 1 && !s0.shown[0].solidSvg, `${key} tim ban đầu: 1 tim rỗng, aria-pressed false`);
          // bật được hay không do cookie Secure của trình duyệt — so với before
          const bOn = bw ? bw[1].pressed === 'true' : true;
          if (bOn) ok(s1.pressed === 'true' && s1.shown.length === 1 && s1.shown[0].solidSvg, `${key} tim sau bấm: 1 tim đặc, aria-pressed ${s1.pressed}, màu ${s1.shown[0]?.color}`);
          else ok(s1.pressed === bw[1].pressed && s1.shown.length === 1, `${key} tim sau bấm: như before (aria-pressed ${s1.pressed}, cookie Secure không ghi được ở trình duyệt này)`);
          ok(s2.pressed === 'false' && s2.shown.length === 1 && !s2.shown[0].solidSvg, `${key} tim bấm lại: 1 tim rỗng, aria-pressed ${s2.pressed}`);
        }
      }
      // (d) popup điều kiện voucher
      const info = p.locator('.pc-voucher__info:visible').first();
      if (await info.count()) {
        await info.scrollIntoViewIfNeeded(); await info.click(); await p.waitForTimeout(500);
        const pop = p.locator('.popup-coupon');
        const openV = await pop.evaluate((e) => e.classList.contains('active') && getComputedStyle(e).opacity === '1'); // popup mở = class active (main.js) + opacity 1
        const mm = await measure(p);
        const closeIco = await p.locator('.close-popup-coupon svg, .close-popup-coupon i').first().evaluate((e) => { const r = e.getBoundingClientRect(); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; }).catch(() => null);
        await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-coupon-popup.png` });
        await p.locator('.close-popup-coupon').click().catch((e) => console.log('   không bấm được nút đóng: ' + String(e).slice(0, 80)));
        await p.waitForTimeout(500);
        const closedV = await pop.evaluate((e) => !e.classList.contains('active') && getComputedStyle(e).opacity === '0');
        console.log(`   ${key} popup voucher: mở ${openV} · icon đóng ${JSON.stringify(closeIco)} · đóng ${closedV}`);
        data[`${key}|popup`] = { openV, closeIco, closedV };
        if (MODE === 'after') {
          ok(mm.fa === 0, `${key} popup voucher mở: <i fa-> = ${mm.fa}`);
          ok(openV && closeIco && closeIco.w > 0 && closeIco.h > 0, `${key} popup voucher mở, icon đóng ${closeIco?.w}×${closeIco?.h}`);
          ok(closedV, `${key} popup voucher đóng sau khi bấm nút đóng`);
        }
      }
    }
  }
  data[`${key}|errs`] = errs;
  console.log(`   ${key} lỗi JS: ${errs.length}${errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''}`);
  if (MODE === 'after') { const be = before?.[`${key}|errs`] || []; const nu = errs.filter((e) => !be.includes(e)); ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`); }
  await b.close();
}
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify(data, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
