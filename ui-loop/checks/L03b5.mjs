// L03b5 (vòng 58, 31/10/2026 — chạy lại: node ui-loop/checks/L03b5.mjs before|after).
// Việc: gỡ Font Awesome ở TRANG GIỎ HÀNG — templates/cart.bwt (tiêu đề, tiếp tục mua, khung đơn hàng, phí ship SSR + JS,
// mã giảm giá, nút thanh toán, 4 ô cam kết theo settings cart_trust_icons) + snippets/cart_skin_plan.bwt (khối phác đồ da:
// trạng thái trống và trạng thái có kết quả — icon JS circle-check / arrow-right) — thay bằng ui_icon size 'em' trong <i> bọc cũ.
// 2 trạng thái khối phác đồ: 'empty' (thiết bị chưa có kết quả) và 'plan' (sessionStorage pc_quiz_skin_type = 'oily').
// Ảnh: ui-loop/evidence/L03b5/<mode>-<trình duyệt>-<khung>-<trạng thái>-<vùng>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b5';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const URL_ = '/?tpl=cart';
const ZONES = ['.pc-cart-gift', '.main-cart-page'];
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
const STATES = ['empty', 'plan'];
const before = MODE === 'after' && fs.existsSync(`${OUT}/before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/before.json`, 'utf8')) : null;
const data = {}; const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✗'} ${msg}`); if (!cond) fails.push(msg); };

const measure = (p, zones) => p.evaluate((zones) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.() !== false; };
  const out = []; let fa = 0;
  for (const z of document.querySelectorAll(zones.join(', '))) {
    for (const i of z.querySelectorAll('i')) {
      const isFa = /(^|\s)fa-|(^|\s)fas(\s|$)/.test(i.className); if (isFa) fa++;
      const svg = i.querySelector(':scope > svg');
      if (!isFa && !svg) continue;
      const t = svg || i; const r = t.getBoundingClientRect(); const par = i.parentElement; const pr = par.getBoundingClientRect();
      const shapes = svg ? [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon')] : [];
      const filled = shapes.filter((e) => getComputedStyle(e).fill !== 'none').length;
      const where = (par.className && String(par.className).split(' ')[0]) || par.tagName.toLowerCase();
      out.push({ zone: where, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|fas\s*/g, '').trim(), vis: vis(t) && vis(i),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
        filled, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null });
    }
  }
  const sk = document.querySelector('[data-cart-skin]');
  return { icons: out, fa, docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length,
    skin: sk ? (sk.hidden ? 'hidden' : sk.getAttribute('data-state') || 'shown') : 'none' };
}, zones);

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const compare = (key, bm, m) => {
  const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
  ok(av.length >= bv.length, `${key}: icon nhìn thấy before ${bv.length} → after ${av.length}`);
  let worst = 0, worstK = '', minR = 9, maxR = 0, parD = 0, parK = '', colD = 0, colK = '';
  bv.forEach((x, i) => { const y = av[i]; if (!y) return;
    const d = Math.hypot(x.rx - y.rx, x.ry - y.ry); if (d > worst) { worst = d; worstK = x.zone + ' ' + x.cls; }
    const pd = Math.max(Math.abs(x.pw - y.pw), Math.abs(x.ph - y.ph)); if (pd > parD) { parD = pd; parK = x.zone + ' ' + x.cls; }
    const rr = (y.h || 0.01) / (x.h || 0.01); minR = Math.min(minR, rr); maxR = Math.max(maxR, rr);
    const a = rgb(x.color), b = rgb(y.color); const cd = Math.max(...a.map((v, k) => Math.abs(v - b[k]))); if (cd > colD) { colD = cd; colK = `${x.zone} ${x.cls} ${x.color} → ${y.color}`; } });
  const badFill = av.filter((y) => y.filled).map((y) => y.zone + ' ' + y.cls);
  const badColor = av.filter((y) => y.stroke && y.stroke !== y.color).map((y) => `${y.zone} stroke ${y.stroke} ≠ ${y.color}`);
  console.log(`   ${key}: lệch tâm lớn nhất ${worst.toFixed(1)}px (${worstK}) · đổi cỡ phần tử cha lớn nhất ${parD.toFixed(1)}px (${parK}) · tỉ lệ cao icon ${minR.toFixed(2)}–${maxR.toFixed(2)} · màu lệch ${colD} (${colK}) · cao trang ${bm.docH} → ${m.docH}`);
  av.forEach((y) => console.log(`      ${y.zone} [${y.cls}] ${y.w}×${y.h} màu ${y.color} tô ${y.filled}/${y.shapes}`));
  ok(worst <= 4 || bv.length === 0, `${key}: lệch tâm icon trong phần tử cha ≤ 4px (đo ${worst.toFixed(1)})`);
  ok(parD <= 4 || bv.length === 0, `${key}: cỡ phần tử chứa icon đổi ≤ 4px (đo ${parD.toFixed(1)})`);
  ok(bv.length === 0 || (minR >= 0.6 && maxR <= 1.6), `${key}: cỡ icon 60–160 % before (${minR.toFixed(2)}–${maxR.toFixed(2)})`);
  ok(colD <= 8, `${key}: màu icon = màu glyph cũ (ΔRGB ${colD})`);
  ok(badFill.length === 0, `${key}: icon nét bị CSS cũ tô đặc = ${badFill.length}${badFill.length ? ' — ' + badFill.slice(0, 3).join(', ') : ''}`);
  ok(badColor.length === 0, `${key}: icon vẽ bằng currentColor = ${av.length - badColor.length}/${av.length}${badColor.length ? ' — ' + badColor.slice(0, 2).join(', ') : ''}`);
  ok(Math.abs(bm.docH - m.docH) <= 4, `${key}: cao trang lệch ${Math.abs(bm.docH - m.docH)}px ≤ 4`);
};

const shot = async (p, sel, file) => {
  const loc = p.locator(sel).first(); if (!(await loc.count()) || !(await loc.isVisible())) return false;
  await loc.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(200);
  await loc.screenshot({ path: file }).catch(() => {}); return true;
};
const SHOTS = [['title', 'h1.title_cart'], ['continue', '.cart-continue-link'], ['summary', '.checkout-header'], ['ship', '[data-cart-shipping]'],
  ['coupon', '.coupon-label'], ['checkout', '#btn-proceed-checkout'], ['trust', '.cart-trust-grid'], ['skin', '[data-cart-skin]']];

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  for (const st of STATES) {
    const key = `${brn}-${fr}-${st}`;
    const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
    if (st === 'plan') await ctx.addInitScript(() => { try { sessionStorage.setItem('pc_quiz_skin_type', 'oily'); sessionStorage.setItem('pc_quiz_saved_at', String(Date.now())); } catch (e) {} });
    // Giỏ có hàng (2 SP mẫu) để khung «Thông tin đơn hàng», mã giảm giá, nút thanh toán, ô cam kết hiển thị
    for (const v of ['10021', '10011']) await ctx.request.post(BASE + '/cart/add.js', { form: { variantId: v, quantity: '1' } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    p.on('dialog', (d) => d.dismiss().catch(() => {}));
    await p.goto(BASE + URL_, { waitUntil: 'load' });
    await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
    await p.waitForTimeout(1500);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await p.waitForTimeout(500);
    const m = await measure(p, ZONES);
    data[key] = m;
    for (const [zn, sel] of SHOTS) await shot(p, sel, `${OUT}/${MODE}-${brn}-${fr}-${st}-${zn}.png`);
    if (fr === '390' || fr === '1440' || fr === 'iphone13') await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${st}-full.png`, fullPage: true });
    // Hành vi JS: phí ship sau sự kiện ajaxCart (nhánh "Miễn phí" dựng icon bằng JS)
    const ship = await p.evaluate(() => {
      const $ = window.jQuery; const s = document.querySelector('[data-cart-shipping]'); if (!$ || !s) return null;
      $(document).trigger('ajaxCart', [{ total_price: 1e12, item_count: 1 }]);
      const v = s.querySelector('[data-cart-shipping-value]'); const i = v && v.querySelector('i');
      const svg = i && i.querySelector('svg'); const r = (svg || i)?.getBoundingClientRect();
      return { txt: v ? v.textContent.trim() : null, fa: i ? /fa-/.test(i.className) : null, svg: !!svg, h: r ? +r.height.toFixed(1) : 0, enabled: s.dataset.enabled };
    });
    data[`${key}|ship`] = ship;
    await shot(p, '[data-cart-shipping]', `${OUT}/${MODE}-${brn}-${fr}-${st}-ship-js.png`);
    // Bàn phím: Tab tới link «Tiếp tục mua hàng» (có icon) — viền focus, Enter mở đúng href
    const link = p.locator('.cart-continue-link:visible').first();
    let kb = null;
    if (await link.count()) {
      await link.scrollIntoViewIfNeeded(); await link.focus();
      if (brn !== 'webkit') { await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); }
      const f = await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { txt: a.textContent.trim().slice(0, 50), cls: a.className, href: a.getAttribute('href'), ow: c.outlineStyle === 'none' ? 0 : parseFloat(c.outlineWidth), oc: c.outlineColor }; });
      await link.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${st}-continue-focus.png` }).catch(() => {});
      await Promise.all([p.waitForURL((u) => u.pathname !== '/', { timeout: 30000 }).catch(() => {}), p.keyboard.press('Enter')]);
      kb = { f, url: new URL(p.url()).pathname };
      console.log(`   ${key} focus: ${JSON.stringify(f)} → Enter mở ${kb.url}`);
    }
    data[`${key}|kb`] = kb;
    console.log(`${key}: FA ${m.fa} · icon nhìn thấy ${m.icons.filter((x) => x.vis).length} · khối phác đồ ${m.skin} · ship JS ${JSON.stringify(ship)} · lỗi JS ${errs.length}${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`);
    if (MODE === 'after') {
      ok(m.fa === 0, `${key}: <i fa-> trong giỏ hàng = ${m.fa}`);
      ok(m.pcErr === 0, `${key}: PC-ERROR ui_icon = ${m.pcErr}`);
      if (before?.[key]) compare(key, before[key], m);
      if (ship) ok(ship.fa === false && ship.svg && ship.h > 0, `${key}: phí ship sau ajaxCart «${ship.txt}» icon SVG cao ${ship.h}px, FA ${ship.fa}`);
      if (kb) {
        ok(/cart-continue-link/.test(kb.f.cls) && (kb.f.ow >= 2 || brn === 'webkit'), `${key}: ${brn === 'webkit' ? 'focus()' : 'Tab'} tới «${kb.f.txt}» viền ${kb.f.ow}px ${kb.f.oc}`);
        ok(kb.url === kb.f.href, `${key}: Enter mở ${kb.url} (href ${kb.f.href})`);
      }
      const be = before?.[`${key}|errs`] || []; const nu = errs.filter((e) => !be.includes(e));
      ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`);
    }
    data[`${key}|errs`] = errs;
    await ctx.close();
  }
  await b.close();
}
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify(data, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
