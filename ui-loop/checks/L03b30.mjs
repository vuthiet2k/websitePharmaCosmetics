// L03b30 (vòng 97, 03/11/2026 — chạy lại: node ui-loop/checks/L03b30.mjs before|after [khung,khung]).
// Việc: gỡ Font Awesome ở 2 lượt chỉ hiện khi có dữ liệu:
//   snippets/tab_product.bwt — mũi tên link «Hỏi chuyên gia về sản phẩm này» (SP không có content lẫn description);
//   snippets/popup_banner.bwt — X đóng popup banner (popup_banner_enable + ảnh).
// Trang: /products/demo-l03b30-mo-ta-trong (SP demo, data/products.js — demo_settings bật popup banner, trễ 300ms) +
//   /products/serum-vitamin-c-15 (SP mẫu thường — chỉ kiểm không đổi: 0 popup banner, 0 ghi chú).
// Ảnh: ui-loop/evidence/L03b30/<mode>-<trình duyệt>-<khung>-<vùng>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b30';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const BASE = 'http://localhost:3000';
const DEMO = '/products/demo-l03b30-mo-ta-trong';
const SERUM = '/products/serum-vitamin-c-15';
const NOTE = '.pc-pdp-spec__note';
const LINK = '.pc-pdp-spec__note a';
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

// Đo icon trong 1 vùng (như L03b8–L03b29): glyph FA đo bằng span ẩn cùng font/ký tự ::before.
const measure = (p, scope) => p.evaluate((scope) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) !== false; };
  const root = document.querySelector(scope); if (!root) return null;
  const out = []; let fa = 0;
  const box = root.getBoundingClientRect();
  for (const i of root.querySelectorAll('i')) {
    const isFa = /(^|\s)fa-|(^|\s)fa[srb](\s|$)/.test(i.className); if (isFa) fa++;
    const svg = i.querySelector(':scope > svg');
    if (!isFa && !svg) continue;
    const t = svg || i; let r = t.getBoundingClientRect();
    let glyph = null;
    if (isFa) { const c = getComputedStyle(i); const cb = getComputedStyle(i, '::before'); const fs = parseFloat(cb.fontSize || c.fontSize); const lh = parseFloat(c.lineHeight) || fs;
      glyph = (cb.content || '').replace(/^"|"$/g, '');
      const s = document.createElement('span'); s.textContent = glyph;
      s.style.cssText = `position:absolute;left:-9999px;top:0;font-family:${cb.fontFamily};font-weight:${cb.fontWeight};font-size:${cb.fontSize};line-height:1;white-space:nowrap`;
      document.body.appendChild(s); const gw = s.getBoundingClientRect().width || r.width; s.remove();
      const pl = parseFloat(c.paddingLeft) + parseFloat(c.borderLeftWidth), pr_ = parseFloat(c.paddingRight) + parseFloat(c.borderRightWidth), pt = parseFloat(c.paddingTop) + parseFloat(c.borderTopWidth), pb = parseFloat(c.paddingBottom) + parseFloat(c.borderBottomWidth);
      const cw = r.width - pl - pr_, chh = r.height - pt - pb;
      if (/flex|grid/.test(c.display)) r = { x: r.x + pl + (cw - gw) / 2, y: r.y + pt + (chh - fs) / 2, width: gw, height: fs };
      else { const al = /center/.test(c.textAlign) ? (cw - gw) / 2 : /right|end/.test(c.textAlign) ? cw - gw : 0; const line = Math.min(chh, Math.max(lh, fs)); r = { x: r.x + pl + al, y: r.y + pt + (line - fs) / 2, width: gw, height: fs }; } }
    const shapes = svg ? [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon')] : [];
    const filled = shapes.filter((e) => getComputedStyle(e).fill !== 'none' && !e.hasAttribute('fill')).length;
    out.push({ cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|inline-flex\s*|inline-block\s*|leading-none\s*/g, '').trim(), vis: vis(t) && vis(i), glyph,
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      rx: +(r.x + r.width / 2 - box.x).toFixed(1), ry: +(r.y + r.height / 2 - box.y).toFixed(1),
      filled, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null });
  }
  return { icons: out, fa, bw: +box.width.toFixed(1), bh: +box.height.toFixed(1), text: (root.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80) };
}, scope);

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const compare = (key, bm, m) => {
  if (!bm || !m) { ok(false, `${key}: có số đo before + after (${!!bm}/${!!m})`); return; }
  const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
  ok(av.length >= bv.length && av.length === m.icons.length, `${key}: icon nhìn thấy before ${bv.length} → after ${av.length}/${m.icons.length}`);
  ok(m.fa === 0, `${key}: <i fa-> trong vùng = ${m.fa}`);
  let worst = 0, minR = 9, maxR = 0, colD = 0, colK = '';
  bv.forEach((x, i) => { const y = av[i]; if (!y) return;
    worst = Math.max(worst, Math.hypot(x.rx - y.rx, x.ry - y.ry));
    const rr = (y.h || 0.01) / (x.h || 0.01); minR = Math.min(minR, rr); maxR = Math.max(maxR, rr);
    const a = rgb(x.color), b = rgb(y.color); const cd = Math.max(...a.map((v, k) => Math.abs(v - b[k]))); if (cd > colD) { colD = cd; colK = `${x.cls} ${x.color} → ${y.color}`; } });
  const boxD = Math.max(Math.abs(bm.bw - m.bw), Math.abs(bm.bh - m.bh));
  const badFill = av.filter((y) => y.filled).length;
  const badColor = av.filter((y) => y.stroke && y.stroke !== y.color).length;
  bm.icons.forEach((x, i) => { const y = m.icons[i] || {}; console.log(`      [${x.cls}] glyph ${JSON.stringify(x.glyph)} nhìn thấy ${x.vis} ${x.w}×${x.h} @${x.rx},${x.ry} → [${y.cls}] nhìn thấy ${y.vis} ${y.w}×${y.h} @${y.rx},${y.ry} màu ${y.color} tô ${y.filled}/${y.shapes}`); });
  console.log(`   ${key}: hộp ${bm.bw}×${bm.bh} → ${m.bw}×${m.bh} · chữ «${bm.text}» → «${m.text}»`);
  ok(worst <= 2, `${key}: lệch tâm icon trong hộp ≤ 2px (đo ${worst.toFixed(1)})`);
  ok(boxD <= 4, `${key}: phần tử cha đổi cỡ ≤ 4px (đo ${boxD.toFixed(1)})`);
  ok(bv.length === 0 || (minR >= 0.6 && maxR <= 1.6), `${key}: cỡ icon 60–160 % before (${minR.toFixed(2)}–${maxR.toFixed(2)})`);
  ok(colD <= 10, `${key}: màu icon ΔRGB ≤ 10 (${colD}${colD ? ' — ' + colK : ''})`);
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
const faIn = (p, sel) => p.evaluate(([sel, re]) => [...document.querySelectorAll(sel)].flatMap((r) => [...r.querySelectorAll('i')]).filter((i) => new RegExp(re).test(i.className)).map((i) => i.className), [`${NOTE}, #modal-banner`, FA_RE.source]);
const focusInfo = (p) => p.evaluate(() => { const a = document.activeElement; if (!a) return null; const c = getComputedStyle(a);
  return { tag: a.tagName, txt: (a.textContent || '').trim().slice(0, 30), outline: `${c.outlineStyle} ${c.outlineWidth} ${c.outlineColor}`, shadow: c.boxShadow, fv: a.matches(':focus-visible') }; });

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  const key = `${brn}-${fr}`;
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  const st = {};
  // ── SP demo ──
  await p.goto(BASE + DEMO, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForTimeout(1200); // popup banner trễ 300ms
  const m = {};
  m.pcErr = await p.evaluate(() => (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length);
  m.faDom = await faIn(p, NOTE);
  st.popupShown = await isShown(p, '#modal-banner');
  m.pclose = await measure(p, '.modalbanner-close');
  const cb = await p.locator('.modalbanner-close').boundingBox().catch(() => null);
  m.pcloseBox = cb ? { w: +cb.width.toFixed(1), h: +cb.height.toFixed(1) } : null;
  await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-popup.png` });
  await shot(p, '.modalbanner-close', `${OUT}/${MODE}-${brn}-${fr}-popup-close.png`);
  // Bấm X ⇒ popup ẩn
  await p.locator('.modalbanner-close').click({ timeout: 3000 }).catch((e) => { st.closeErr = String(e).slice(0, 80); });
  await p.waitForTimeout(300);
  st.popupAfterClose = await isShown(p, '#modal-banner');
  // Phụ (ngoài so sánh before/after): khung thấp (844×390) nút X nằm ngoài khung nhìn (có từ trước — N48) ⇒ gọi click()
  // bằng JS để xác nhận nút X sau khi đổi icon vẫn đóng được popup; ghi vị trí nút X.
  const xr = await p.evaluate(() => { const r = document.querySelector('.modalbanner-close')?.getBoundingClientRect(); return r ? { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), vh: innerHeight } : null; });
  const ex = { xRect: xr };
  if (st.popupAfterClose === true) { await p.evaluate(() => document.querySelector('.modalbanner-close').click()); await p.waitForTimeout(300); ex.jsCloseHidden = (await isShown(p, '#modal-banner')) === false; }
  // Ghi chú mô tả trống trong tab mô tả
  await p.locator(NOTE).first().scrollIntoViewIfNeeded().catch(() => {});
  await p.waitForTimeout(400);
  m.docH = await p.evaluate(() => document.documentElement.scrollHeight);
  m.note = await measure(p, NOTE);
  m.link = await measure(p, LINK);
  await shot(p, NOTE, `${OUT}/${MODE}-${brn}-${fr}-note.png`);
  // Bàn phím: focus phần tử ngay trước link rồi Tab tới link; Shift+Tab lùi; Tab lại + Enter ⇒ /dat-lich-tu-van
  await p.locator(LINK).focus();
  await p.keyboard.press('Shift+Tab'); st.shiftBack = (await focusInfo(p))?.tag;
  await p.keyboard.press('Tab'); const fi = await focusInfo(p);
  st.tabToLink = fi?.txt; m.focus = fi;
  await shot(p, NOTE, `${OUT}/${MODE}-${brn}-${fr}-note-focus.png`);
  // WebKit (Safari) mặc định Tab bỏ qua link ⇒ focus link bằng mã rồi Enter (phụ, ngoài so sánh before/after).
  if (fi?.tag !== 'A') { await p.locator(LINK).focus(); ex.directFocus = await focusInfo(p); await shot(p, NOTE, `${OUT}/${MODE}-${brn}-${fr}-note-focus-direct.png`); }
  await Promise.all([p.waitForURL('**/dat-lich-tu-van**', { timeout: 8000 }).catch(() => {}), p.keyboard.press('Enter')]);
  if (fi?.tag !== 'A') ex.enterUrl = new URL(p.url()).pathname; else st.enterUrl = new URL(p.url()).pathname;
  data[key] = m; data[`${key}|state`] = st; data[`${key}|extra`] = ex;
  // ── SP thường ──
  await p.goto(BASE + SERUM, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForTimeout(1000);
  const s = { docH: await p.evaluate(() => document.documentElement.scrollHeight), popup: await p.evaluate(() => document.querySelectorAll('#modal-banner').length), note: await p.evaluate((n) => document.querySelectorAll(n).length, NOTE) };
  data[`${key}|serum`] = s;
  console.log(`${key}: FA vùng ${m.faDom.length} [${m.faDom.join(' | ')}] · cao ${m.docH} · nút X ${JSON.stringify(m.pcloseBox)} · focus ${JSON.stringify(m.focus)} · tương tác ${JSON.stringify(st)} · serum ${JSON.stringify(s)} · lỗi JS ${errs.length}${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`);
  if (MODE === 'after') {
    const B = before?.[key] || null;
    ok(m.faDom.length === 0, `${key}: <i fa-> trong ghi chú + popup banner = ${m.faDom.length}`);
    ok(m.pcErr === 0, `${key}: PC-ERROR ui_icon = ${m.pcErr}`);
    compare(`${key} X popup banner`, B?.pclose, m.pclose);
    compare(`${key} ghi chú «Hỏi chuyên gia»`, B?.note, m.note);
    ok(B && Math.abs(B.docH - m.docH) <= 4, `${key}: cao trang SP demo lệch ${B ? Math.abs(B.docH - m.docH) : '?'}px ≤ 4`);
    ok(m.focus && B?.focus && m.focus.outline === B.focus.outline && m.focus.shadow === B.focus.shadow, `${key}: viền focus link before «${B?.focus?.outline} / ${B?.focus?.shadow}» = after «${m.focus?.outline} / ${m.focus?.shadow}»`);
    console.log(`   ${key} phụ: ${JSON.stringify(ex)}`);
    ok(st.popupShown === true && (st.popupAfterClose === false || ex.jsCloseHidden === true), `${key}: popup hiện ${st.popupShown} → bấm X ẩn ${st.popupAfterClose === false}${ex.jsCloseHidden !== undefined ? ` (X ngoài khung nhìn top ${ex.xRect?.top}px — click() JS ẩn ${ex.jsCloseHidden})` : ''}`);
    const eu = st.enterUrl || ex.enterUrl;
    ok(eu === '/dat-lich-tu-van', `${key}: Enter trên link ⇒ ${eu}${ex.enterUrl ? ' (WebKit: focus bằng mã, viền ' + ex.directFocus?.outline + ')' : ''}`);
    if (ex.directFocus) ok(/solid 2px rgb\(7, 91, 64\)/.test(ex.directFocus.outline) || ex.directFocus.shadow !== 'none', `${key}: link focus (bằng mã) có viền — ${ex.directFocus.outline}`);
    const bst = { ...(before?.[`${key}|state`] || {}) }; if (ex.enterUrl) delete bst.enterUrl; // WebKit: Enter đo ở mục phụ
    const bs = JSON.stringify(bst), as = JSON.stringify(st);
    ok(bs === as, `${key}: tương tác before ${bs} = after ${as}`);
    const BS = before?.[`${key}|serum`];
    ok(BS && BS.docH === s.docH && s.popup === 0 && s.note === 0, `${key}: SP thường cao ${BS?.docH} → ${s.docH}, popup banner ${s.popup}, ghi chú ${s.note}`);
    const be = before?.[`${key}|errs`] || []; const nu = errs.filter((e) => !be.includes(e));
    ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`);
  }
  data[`${key}|errs`] = errs;
  await ctx.close(); await b.close();
}
const prev = process.argv[3] && fs.existsSync(`${OUT}/${MODE}.json`) ? JSON.parse(fs.readFileSync(`${OUT}/${MODE}.json`, 'utf8')) : {};
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify({ ...prev, ...data }, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
