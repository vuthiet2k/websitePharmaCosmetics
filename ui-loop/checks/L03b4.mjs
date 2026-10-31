// L03b4 (vòng 56, 31/10/2026 — chạy lại: node ui-loop/checks/L03b4.mjs before|after).
// Việc: gỡ Font Awesome ở TRANG SẢN PHẨM (phần có dữ liệu mẫu hiển thị): sao đánh giá đầy/nửa, nút Mua ngay (bolt),
// nút khối Ý kiến chuyên gia (arrow-right), popup trả góp (money-bill + xmark) — thay bằng ui_icon size 'em' trong <i> bọc cũ.
// Tiêu chí (BACKLOG L03b4): 7 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13) × 2 trang:
//   · 0 <i class="fa-…"> trong .pc-stars, .box_btn_acc, .pc-pdp-expert-section, #modal-tragop-product (popup mở); 0 PC-ERROR ui_icon;
//   · icon nhìn thấy after ≥ before; lệch tâm ≤ 4px; phần tử cha đổi cỡ ≤ 4px; cao icon 60–160 %; icon nét không tô đặc;
//     sao đầy tô đặc, sao nửa đúng 1 path tô; màu icon = màu glyph FA cũ (ΔRGB ≤ 8); cao trang lệch ≤ 4px;
//   · X đóng popup trả góp; Tab tới nút khối chuyên gia có viền focus, Enter mở /dat-lich-tu-van; 0 lỗi JS mới.
// Ảnh: ui-loop/evidence/L03b4/<mode>-<trình duyệt>-<khung>-<trang>-<vùng>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b4';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const PAGES = [['vitc', '/products/serum-vitamin-c-15'], ['ha', '/products/kem-duong-am-hyaluronic-acid']];
const ZONES = ['.pc-stars', '.box_btn_acc', '.pc-pdp-expert-section', '#modal-tragop-product'];
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

const measure = (p, zones) => p.evaluate((zones) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.() !== false; };
  const out = []; let fa = 0;
  for (const z of document.querySelectorAll(zones.join(', '))) {
    const zn = zones.find((s) => z.matches(s));
    for (const i of z.querySelectorAll('i')) {
      const isFa = /(^|\s)fa-|(^|\s)fas(\s|$)/.test(i.className); if (isFa) fa++;
      const svg = i.querySelector(':scope > svg');
      if (!isFa && !svg) continue;
      const t = svg || i; const r = t.getBoundingClientRect(); const pr = i.parentElement.getBoundingClientRect();
      const shapes = svg ? [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon')] : [];
      const filled = shapes.filter((e) => getComputedStyle(e).fill !== 'none').length;
      out.push({ zone: zn, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|fas\s*/g, '').trim(), vis: vis(t) && vis(i),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
        filled, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null });
    }
  }
  return { icons: out, fa, docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length };
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
  const isStar = (y) => y.zone === '.pc-stars';
  const badFill = av.filter((y) => !isStar(y) && y.filled).map((y) => y.zone + ' ' + y.cls);
  const badStar = av.filter((y) => isStar(y) && !(y.filled === y.shapes || (y.shapes === 2 && y.filled === 1))).map((y) => `${y.cls} ${y.filled}/${y.shapes}`);
  const badColor = av.filter((y) => y.stroke && y.stroke !== y.color).map((y) => `${y.zone} stroke ${y.stroke} ≠ ${y.color}`);
  console.log(`   ${key}: lệch tâm lớn nhất ${worst.toFixed(1)}px (${worstK}) · đổi cỡ phần tử cha lớn nhất ${parD.toFixed(1)}px (${parK}) · tỉ lệ cao icon ${minR.toFixed(2)}–${maxR.toFixed(2)} · màu lệch ${colD} (${colK}) · cao trang ${bm.docH} → ${m.docH}`);
  av.forEach((y) => console.log(`      ${y.zone} [${y.cls}] ${y.w}×${y.h} màu ${y.color} tô ${y.filled}/${y.shapes}`));
  ok(worst <= 4 || bv.length === 0, `${key}: lệch tâm icon trong phần tử cha ≤ 4px (đo ${worst.toFixed(1)})`);
  ok(parD <= 4 || bv.length === 0, `${key}: cỡ phần tử chứa icon đổi ≤ 4px (đo ${parD.toFixed(1)})`);
  ok(bv.length === 0 || (minR >= 0.6 && maxR <= 1.6), `${key}: cỡ icon 60–160 % before (${minR.toFixed(2)}–${maxR.toFixed(2)})`);
  ok(colD <= 8, `${key}: màu icon = màu glyph cũ (ΔRGB ${colD})`);
  ok(badFill.length === 0, `${key}: icon nét bị CSS cũ tô đặc = ${badFill.length}${badFill.length ? ' — ' + badFill.slice(0, 3).join(', ') : ''}`);
  ok(badStar.length === 0, `${key}: sao đầy tô hết / sao nửa tô 1 path — sai ${badStar.length}${badStar.length ? ' — ' + badStar.join(', ') : ''}`);
  ok(badColor.length === 0, `${key}: icon vẽ bằng currentColor = ${av.length - badColor.length}/${av.length}${badColor.length ? ' — ' + badColor.slice(0, 2).join(', ') : ''}`);
  if (bm.docH != null) ok(Math.abs(bm.docH - m.docH) <= 4, `${key}: cao trang lệch ${Math.abs(bm.docH - m.docH)}px ≤ 4`);
};

const shot = async (p, sel, file) => {
  const loc = p.locator(sel).first(); if (!(await loc.count()) || !(await loc.isVisible())) return;
  await loc.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(200);
  await loc.screenshot({ path: file }).catch(() => {});
};

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  for (const [pk, url] of PAGES) {
    const key = `${brn}-${fr}-${pk}`;
    const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    p.on('dialog', (d) => d.dismiss().catch(() => {}));
    await p.goto(BASE + url, { waitUntil: 'load' });
    await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
    await p.waitForTimeout(800);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await p.waitForTimeout(500);
    const m = await measure(p, ZONES.slice(0, 3));
    data[key] = m;
    for (const [zn, sel] of [['stars', '.pc-stars'], ['buy', '.box_btn_acc'], ['expert', '.pc-pdp-expert-btn']]) await shot(p, sel, `${OUT}/${MODE}-${brn}-${fr}-${pk}-${zn}.png`);
    // (c) bàn phím: nút khối chuyên gia
    const link = p.locator('.pc-pdp-expert-btn:visible').first();
    if (await link.count()) {
      await link.scrollIntoViewIfNeeded(); await link.focus();
      if (brn !== 'webkit') { await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); }
      const f = await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { txt: a.textContent.trim().slice(0, 50), cls: a.className, ow: c.outlineStyle === 'none' ? 0 : parseFloat(c.outlineWidth), oc: c.outlineColor }; });
      await link.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pk}-expert-focus.png` }).catch(() => {});
      await Promise.all([p.waitForURL((u) => u.pathname === '/dat-lich-tu-van', { timeout: 30000 }).catch(() => {}), p.keyboard.press('Enter')]);
      const u2 = new URL(p.url()).pathname;
      console.log(`   ${key} focus: ${JSON.stringify(f)} → Enter mở ${u2}`);
      data[`${key}|kb`] = { f, url: u2 };
      if (MODE === 'after') {
        ok(/pc-pdp-expert-btn/.test(f.cls) && (f.ow >= 2 || brn === 'webkit'), `${key}: ${brn === 'webkit' ? 'focus()' : 'Tab'} tới «${f.txt}» viền focus ${f.ow}px ${f.oc}`);
        ok(u2 === '/dat-lich-tu-van', `${key}: Enter mở /dat-lich-tu-van (thực ${u2})`);
      }
      await p.goto(BASE + url, { waitUntil: 'load' }); await p.evaluate(() => document.getElementById('dev-toolbar')?.remove()); await p.waitForTimeout(600);
    }
    // popup trả góp: mở bằng nút thật nếu nhìn thấy, không thì .show() (như JS của snippet)
    const btn = p.locator('.tragop-button:visible').first();
    let how = 'show()';
    if (await btn.count()) { await btn.scrollIntoViewIfNeeded(); await btn.click(); how = 'bấm nút'; }
    else await p.evaluate(() => { document.getElementById('modal-tragop-product').style.display = 'block'; });
    await p.waitForTimeout(400);
    const mp = await measure(p, ZONES.slice(3)); mp.docH = null;
    data[`${key}|popup`] = mp;
    await p.locator('#modal-tragop-product .chosee_size').screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pk}-tragop-title.png` }).catch(() => {});
    await shot(p, '.modaltragop-close', `${OUT}/${MODE}-${brn}-${fr}-${pk}-tragop-close.png`);
    await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pk}-tragop.png` });
    const closeBtn = p.locator('#modal-tragop-product .modaltragop-close');
    let closed = null;
    if (await closeBtn.isVisible()) { await closeBtn.click(); await p.waitForTimeout(300); closed = !(await p.locator('#modal-tragop-product').isVisible()); }
    console.log(`   ${key} popup trả góp (${how}): icon ${mp.icons.filter((x) => x.vis).length} nhìn thấy, FA ${mp.fa}; bấm X ⇒ ẩn: ${closed}`);
    data[`${key}|closed`] = closed;
    if (MODE === 'after') {
      ok(m.fa === 0 && mp.fa === 0, `${key}: <i fa-> trong vùng = ${m.fa} + popup ${mp.fa}`);
      ok(m.pcErr === 0, `${key}: PC-ERROR ui_icon = ${m.pcErr}`);
      if (before?.[key]) compare(key, before[key], m);
      if (before?.[`${key}|popup`]) compare(`${key}|popup`, before[`${key}|popup`], mp);
      ok(closed === true, `${key}: bấm X đóng popup trả góp (${closed})`);
    } else console.log(`${key}: FA ${m.fa} · nhìn thấy ${m.icons.filter((x) => x.vis).length}`);
    data[`${key}|errs`] = errs;
    console.log(`   ${key} lỗi JS: ${errs.length}${errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''}`);
    if (MODE === 'after') { const be = before?.[`${key}|errs`] || []; const nu = errs.filter((e) => !be.includes(e)); ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`); }
    await ctx.close();
  }
  await b.close();
}
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify(data, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
