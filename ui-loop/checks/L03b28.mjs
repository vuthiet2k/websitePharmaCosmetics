// L03b28 (vòng 94, 03/11/2026 — chạy lại: node ui-loop/checks/L03b28.mjs before|after [khung,khung]).
// Việc: gỡ Font Awesome ở templates/product.bwt (6 lượt): nút «Xem video» youtube (2 nhánh 116/122), sao rỗng (251),
//   nút đóng popup thông tin chi tiết (870) / popup cửa hàng (889) / popup video (898).
// Trang: /products/demo-l03b28-trang-sp (SP demo: tag video:, điểm 4/5 ⇒ 1 sao rỗng, bật hệ thống cửa hàng) +
//   /products/serum-vitamin-c-15 (SP mẫu thường — chỉ kiểm không đổi).
// Ở local dựng được 4/6 lượt: nhánh 116 cần metafield custom.Video + settings.metafield_show; popup 870 nằm sau
//   `forloop.index0 == '1'` (LiquidJS so sánh số với chuỗi ⇒ luôn sai) — markup 2 chỗ này giống hệt 122 / 889.
// Popup cửa hàng ở local không có nút mở (.btn-hethong nằm trong khối hệ thống cửa hàng chưa có dữ liệu) ⇒ mở bằng
//   đúng lệnh của nút đó: $('.modalstore-product').show(). Request YouTube bị chặn (iframe rỗng, before = after).
// Ảnh: ui-loop/evidence/L03b28/<mode>-<trình duyệt>-<khung>-<vùng>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b28';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const BASE = 'http://localhost:3000';
const DEMO = '/products/demo-l03b28-trang-sp';
const SERUM = '/products/serum-vitamin-c-15';
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
const FA_RE = /(^|\s)fa-|(^|\s)fa[srb](\s|$)/;

// Đo icon trong 1 vùng (như L03b8–L03b27): glyph FA đo bằng span ẩn cùng font/ký tự ::before.
const measure = (p, scope) => p.evaluate((scope) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) !== false; };
  const root = document.querySelector(scope); if (!root) return null;
  const out = []; let fa = 0;
  const box = root.getBoundingClientRect();
  for (const i of root.querySelectorAll('i')) {
    const isFa = /(^|\s)fa-|(^|\s)fa[srb](\s|$)/.test(i.className); if (isFa) fa++;
    const svg = i.querySelector(':scope > svg');
    if (!isFa && !svg) continue;
    const t = svg || i; let r = t.getBoundingClientRect(); const par = i.parentElement; const pr = par.getBoundingClientRect();
    if (isFa) { const c = getComputedStyle(i); const cb = getComputedStyle(i, '::before'); const fs = parseFloat(cb.fontSize || c.fontSize); const lh = parseFloat(c.lineHeight) || fs;
      const s = document.createElement('span'); s.textContent = (cb.content || '').replace(/^"|"$/g, '');
      s.style.cssText = `position:absolute;left:-9999px;top:0;font-family:${cb.fontFamily};font-weight:${cb.fontWeight};font-size:${cb.fontSize};line-height:1;white-space:nowrap`;
      document.body.appendChild(s); const gw = s.getBoundingClientRect().width || r.width; s.remove();
      const pl = parseFloat(c.paddingLeft) + parseFloat(c.borderLeftWidth), pr_ = parseFloat(c.paddingRight) + parseFloat(c.borderRightWidth), pt = parseFloat(c.paddingTop) + parseFloat(c.borderTopWidth), pb = parseFloat(c.paddingBottom) + parseFloat(c.borderBottomWidth);
      const cw = r.width - pl - pr_, chh = r.height - pt - pb;
      if (/flex|grid/.test(c.display)) r = { x: r.x + pl + (cw - gw) / 2, y: r.y + pt + (chh - fs) / 2, width: gw, height: fs };
      else { const al = /center/.test(c.textAlign) ? (cw - gw) / 2 : /right|end/.test(c.textAlign) ? cw - gw : 0; const line = Math.min(chh, Math.max(lh, fs)); r = { x: r.x + pl + al, y: r.y + pt + (line - fs) / 2, width: gw, height: fs }; } }
    const shapes = svg ? [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon')] : [];
    const filled = shapes.filter((e) => getComputedStyle(e).fill !== 'none' && !e.hasAttribute('fill')).length;
    out.push({ cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|inline-block\s*|leading-none\s*|px-px\s*/g, '').trim(), vis: vis(t) && vis(i),
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      rx: +(r.x + r.width / 2 - box.x).toFixed(1), ry: +(r.y + r.height / 2 - box.y).toFixed(1),
      filled, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null });
  }
  return { icons: out, fa, bw: +box.width.toFixed(1), bh: +box.height.toFixed(1), text: (root.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) };
}, scope);

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const compare = (key, bm, m) => {
  if (!bm || !m) { ok(false, `${key}: có số đo before + after (${!!bm}/${!!m})`); return; }
  const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
  ok(av.length === bv.length, `${key}: icon nhìn thấy before ${bv.length} → after ${av.length}`);
  ok(m.fa === 0, `${key}: <i fa-> trong vùng = ${m.fa}`);
  let worst = 0, minR = 9, maxR = 0, colD = 0, colK = '';
  bv.forEach((x, i) => { const y = av[i]; if (!y) return;
    worst = Math.max(worst, Math.hypot(x.rx - y.rx, x.ry - y.ry));
    const rr = (y.h || 0.01) / (x.h || 0.01); minR = Math.min(minR, rr); maxR = Math.max(maxR, rr);
    const a = rgb(x.color), b = rgb(y.color); const cd = Math.max(...a.map((v, k) => Math.abs(v - b[k]))); if (cd > colD) { colD = cd; colK = `${x.cls} ${x.color} → ${y.color}`; } });
  const boxD = Math.max(Math.abs(bm.bw - m.bw), Math.abs(bm.bh - m.bh));
  const badFill = av.filter((y) => y.filled).length;
  const badColor = av.filter((y) => y.stroke && y.stroke !== y.color).length;
  bv.forEach((x, i) => { const y = av[i] || {}; console.log(`      [${x.cls}] ${x.w}×${x.h} @${x.rx},${x.ry} → [${y.cls}] ${y.w}×${y.h} @${y.rx},${y.ry} màu ${y.color} tô ${y.filled}/${y.shapes}`); });
  console.log(`   ${key}: hộp ${bm.bw}×${bm.bh} → ${m.bw}×${m.bh} · chữ «${bm.text}» → «${m.text}»`);
  ok(worst <= 2, `${key}: lệch tâm icon trong hộp ≤ 2px (đo ${worst.toFixed(1)})`);
  ok(boxD <= 2, `${key}: hộp chứa icon đổi cỡ ≤ 2px (đo ${boxD.toFixed(1)})`);
  ok(bv.length === 0 || (minR >= 0.6 && maxR <= 1.6), `${key}: cỡ icon 60–160 % before (${minR.toFixed(2)}–${maxR.toFixed(2)})`);
  ok(colD <= 8, `${key}: màu icon = màu glyph cũ (ΔRGB ${colD}${colD ? ' — ' + colK : ''})`);
  ok(badFill === 0, `${key}: icon nét bị CSS cũ tô đặc = ${badFill}`);
  ok(badColor === 0, `${key}: icon vẽ bằng currentColor (${av.length - badColor}/${av.length})`);
  ok(bm.text === m.text, `${key}: chữ trong hộp giữ nguyên`);
};

const shot = async (p, sel, file) => {
  const loc = p.locator(sel).first(); if (!(await loc.count()) || !(await loc.isVisible())) return false;
  await loc.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(250);
  await loc.screenshot({ path: file }).catch(() => {}); return true;
};
const isShown = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return 'none'; const c = getComputedStyle(e); return c.display !== 'none' && c.visibility !== 'hidden' && e.getBoundingClientRect().height > 0; }, sel);
const faAll = (p) => p.evaluate((re) => [...document.querySelectorAll('body i')].filter((i) => new RegExp(re).test(i.className) && !i.closest('header, footer, .header, #footer, .site-footer')).map((i) => i.className), FA_RE.source);

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  const key = `${brn}-${fr}`;
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  await ctx.route(/youtube\.com|ytimg\.com|googlevideo\.com/, (r) => r.abort());
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  const st = {};
  // ── SP demo ──
  await p.goto(BASE + DEMO, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.evaluate(async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(1000);
  const m = {};
  m.docH = await p.evaluate(() => document.documentElement.scrollHeight);
  m.pcErr = await p.evaluate(() => (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length);
  m.faDom = await faAll(p);
  m.play = await measure(p, '.play-video');
  m.stars = await measure(p, '.pc-stars');
  await shot(p, '.play-video', `${OUT}/${MODE}-${brn}-${fr}-video-btn.png`);
  await shot(p, '.pc-stars', `${OUT}/${MODE}-${brn}-${fr}-stars.png`);
  // Popup video: bấm nút
  await p.locator('.playVideo').first().scrollIntoViewIfNeeded().catch(() => {});
  await p.locator('.playVideo').first().click();
  await p.waitForTimeout(400);
  st.videoOpenClick = await p.evaluate(() => document.querySelector('.popup-video')?.classList.contains('active') ?? 'none');
  m.vclose = await measure(p, '.close-popup-video');
  await shot(p, '.close-popup-video', `${OUT}/${MODE}-${brn}-${fr}-video-close.png`);
  await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-video-popup.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  st.videoAfterEsc = await p.evaluate(() => document.querySelector('.popup-video')?.classList.contains('active') ?? 'none');
  await p.locator('.close-popup-video').click({ force: true }).catch((e) => { st.videoCloseErr = String(e).slice(0, 60); });
  await p.waitForTimeout(300);
  st.videoAfterClose = await p.evaluate(() => document.querySelector('.popup-video')?.classList.contains('active') ?? 'none');
  // Bàn phím: focus nút video → Enter mở → bấm Đóng; Tab/Shift+Tab quanh nút
  await p.locator('.playVideo').first().focus();
  st.playFocus = await p.evaluate(() => document.activeElement?.className || '');
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  st.videoOpenEnter = await p.evaluate(() => document.querySelector('.popup-video')?.classList.contains('active') ?? 'none');
  await p.locator('.close-popup-video').click({ force: true }).catch(() => {});
  await p.waitForTimeout(200);
  await p.locator('.playVideo').first().focus();
  await p.keyboard.press('Tab'); st.tabNext = await p.evaluate(() => (document.activeElement?.className || document.activeElement?.tagName || '').slice(0, 40));
  await p.keyboard.press('Shift+Tab'); st.shiftBack = await p.evaluate(() => (document.activeElement?.className || '').slice(0, 40));
  // Popup cửa hàng: lệnh của nút .btn-hethong (không có ở local)
  await p.evaluate(() => window.jQuery && jQuery('.modalstore-product').show());
  await p.waitForTimeout(300);
  st.storeOpen = await isShown(p, '#modal-store-product');
  m.sclose = await measure(p, '.modalstore-close');
  await shot(p, '.modal-store-product', `${OUT}/${MODE}-${brn}-${fr}-store-popup.png`);
  await shot(p, '.modalstore-close', `${OUT}/${MODE}-${brn}-${fr}-store-close.png`);
  await p.locator('.modalstore-close').click({ force: true }).catch((e) => { st.storeCloseErr = String(e).slice(0, 60); });
  await p.waitForTimeout(300);
  st.storeAfterClose = await isShown(p, '#modal-store-product');
  m.specModal = await p.evaluate(() => !!document.querySelector('#specificationsModal'));
  data[key] = m; data[`${key}|state`] = st;
  // ── SP thường ──
  await p.goto(BASE + SERUM, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForTimeout(800);
  const s = { docH: await p.evaluate(() => document.documentElement.scrollHeight), faDom: await faAll(p), stars: await measure(p, '.pc-stars'), play: await measure(p, '.play-video') };
  data[`${key}|serum`] = s;
  console.log(`${key}: demo FA ${m.faDom.length} [${m.faDom.join(' | ')}] · cao ${m.docH} · popup chi tiết ${m.specModal} · tương tác ${JSON.stringify(st)} · serum FA ${s.faDom.length} cao ${s.docH} · lỗi JS ${errs.length}${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`);
  if (MODE === 'after') {
    const B = before?.[key] || null;
    ok(m.faDom.length === 0, `${key}: <i fa-> trong SP demo (kể cả 2 popup đã mở) = ${m.faDom.length}`);
    ok(m.pcErr === 0, `${key}: PC-ERROR ui_icon = ${m.pcErr}`);
    compare(`${key} nút video`, B?.play, m.play);
    compare(`${key} sao`, B?.stars, m.stars);
    compare(`${key} đóng popup video`, B?.vclose, m.vclose);
    compare(`${key} đóng popup cửa hàng`, B?.sclose, m.sclose);
    ok(B && Math.abs(B.docH - m.docH) <= 4, `${key}: cao trang SP demo lệch ${B ? Math.abs(B.docH - m.docH) : '?'}px ≤ 4`);
    const bs = JSON.stringify(before?.[`${key}|state`]), as = JSON.stringify(st);
    ok(bs === as, `${key}: tương tác before ${bs} = after ${as}`);
    const BS = before?.[`${key}|serum`];
    // SP thường: không nhánh nào của 6 lượt được dựng ⇒ chỉ kiểm không đổi (FA còn lại thuộc file khác — in ra tên class).
    ok(BS && BS.docH === s.docH && JSON.stringify(s.faDom) === JSON.stringify(BS.faDom), `${key}: SP thường cao ${BS?.docH} → ${s.docH}, FA ${BS?.faDom.length} → ${s.faDom.length} [${s.faDom.join(' | ')}]`);
    if (BS?.stars || s.stars) compare(`${key} serum sao`, BS?.stars, s.stars);
    const be = before?.[`${key}|errs`] || []; const nu = errs.filter((e) => !be.includes(e));
    ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`);
  }
  data[`${key}|errs`] = errs;
  await ctx.close(); await b.close();
}
const prev = process.argv[3] && fs.existsSync(`${OUT}/${MODE}.json`) ? JSON.parse(fs.readFileSync(`${OUT}/${MODE}.json`, 'utf8')) : {};
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify({ ...prev, ...data }, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
