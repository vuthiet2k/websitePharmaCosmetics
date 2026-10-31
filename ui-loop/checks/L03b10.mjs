// L03b10 (vòng 67, 01/11/2026 — chạy lại: node ui-loop/checks/L03b10.mjs before|after [khung,khung]).
// Việc: gỡ Font Awesome ở BÀI CA TRƯỚC & SAU (templates/article.truoc-va-sau.bwt) — thay bằng ui_icon size 'em' trong <i> bọc cũ.
// Đo 2 lần: (1) sau khi cuộn hết trang rồi về đầu (thân bài + cột phải); (2) cuộn tới thẻ trích dẫn — thanh đặt lịch bám đáy (< 992px).
// Tương tác: thanh bám đáy hiện/ẩn; Shift+Tab rồi Tab về nút đặt lịch thẻ CTA (viền focus).
// Ảnh: ui-loop/evidence/L03b10/<mode>-<trình duyệt>-<khung>-<vùng>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b10';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const BASE = 'http://localhost:3000';
const URL_ = '/blogs/truoc-va-sau-1/hanh-trinh-8-tuan-cai-thien-da-mun-viem';
const ZONES = ['section.pc-bd .article-main'];
const ZSTICKY = ['#pc-bd-sticky'];
const CHROME = 'header.header, .site-header, footer, #footer, .pc-bottom-nav, .pc-bottomnav, .main-widget, .site-topbar, [class*="topbar"], .ajaxcart, #dev-toolbar, .breadcrumb, .bread-crumb';
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

// Hàm đo giống L03b8/L03b9: glyph FA đo bằng span ẩn cùng font/ký tự ::before (hộp <i> có thể bị flex kéo giãn).
const measure = (p, [zones, chrome]) => p.evaluate(([zones, chrome]) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) !== false; };
  const out = []; let fa = 0;
  for (const z of document.querySelectorAll(zones.join(', '))) {
    for (const i of z.querySelectorAll('i')) {
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
      const filled = shapes.filter((e) => getComputedStyle(e).fill !== 'none').length;
      const where = (par.className && String(par.className).split(' ')[0]) || par.tagName.toLowerCase();
      out.push({ zone: where, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|fa[srb]\s+|inline-block\s*|leading-none\s*/g, '').trim(), vis: vis(t) && vis(i),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
        filled, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null });
    }
  }
  const faPage = [...document.querySelectorAll('i')].filter((i) => /(^|\s)fa-|(^|\s)fa[srb](\s|$)/.test(i.className) && !i.closest(chrome)).map((i) => i.className);
  return { icons: out, fa, faPage, docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length };
}, [zones, chrome]);

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const compare = (key, bm, m, checkH) => {
  const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
  ok(av.length >= bv.length, `${key}: icon nhìn thấy before ${bv.length} → after ${av.length}`);
  let worst = 0, worstK = '', minR = 9, maxR = 0, parD = 0, parK = '', colD = 0, colK = '', rK = '';
  bv.forEach((x, i) => { const y = av[i]; if (!y) return;
    const d = Math.hypot(x.rx - y.rx, x.ry - y.ry); if (d > worst) { worst = d; worstK = x.zone + ' ' + x.cls; }
    const pd = Math.max(Math.abs(x.pw - y.pw), Math.abs(x.ph - y.ph)); if (pd > parD) { parD = pd; parK = x.zone + ' ' + x.cls; }
    const rr = (y.h || 0.01) / (x.h || 0.01); if (rr < minR) { minR = rr; rK = x.zone; } maxR = Math.max(maxR, rr);
    const a = rgb(x.color), b = rgb(y.color); const cd = Math.max(...a.map((v, k) => Math.abs(v - b[k]))); if (cd > colD) { colD = cd; colK = `${x.zone} ${x.cls} ${x.color} → ${y.color}`; } });
  const badFill = av.filter((y) => y.filled).map((y) => y.zone + ' ' + y.cls);
  const badColor = av.filter((y) => y.stroke && y.stroke !== y.color).map((y) => `${y.zone} stroke ${y.stroke} ≠ ${y.color}`);
  console.log(`   ${key}: lệch tâm lớn nhất ${worst.toFixed(1)}px (${worstK}) · đổi cỡ phần tử cha lớn nhất ${parD.toFixed(1)}px (${parK}) · tỉ lệ cao icon ${minR.toFixed(2)} (${rK})–${maxR.toFixed(2)} · màu lệch ${colD} (${colK}) · cao trang ${bm.docH} → ${m.docH}`);
  bv.forEach((x, i) => { const y = av[i] || {}; console.log(`      ${x.zone} [${x.cls}] ${x.w}×${x.h} @${x.rx},${x.ry} cha ${x.pw}×${x.ph} → [${y.cls}] ${y.w}×${y.h} @${y.rx},${y.ry} cha ${y.pw}×${y.ph} màu ${y.color} tô ${y.filled}/${y.shapes}`); });
  ok(worst <= 4 || bv.length === 0, `${key}: lệch tâm icon trong phần tử cha ≤ 4px (đo ${worst.toFixed(1)})`);
  ok(parD <= 4 || bv.length === 0, `${key}: cỡ phần tử chứa icon đổi ≤ 4px (đo ${parD.toFixed(1)})`);
  ok(bv.length === 0 || (minR >= 0.6 && maxR <= 1.6), `${key}: cỡ icon 60–160 % before (${minR.toFixed(2)}–${maxR.toFixed(2)})`);
  ok(colD <= 8, `${key}: màu icon = màu glyph cũ (ΔRGB ${colD})`);
  ok(badFill.length === 0, `${key}: icon nét bị CSS cũ tô đặc = ${badFill.length}${badFill.length ? ' — ' + badFill.slice(0, 3).join(', ') : ''}`);
  ok(badColor.length === 0, `${key}: icon vẽ bằng currentColor = ${av.length - badColor.length}/${av.length}${badColor.length ? ' — ' + badColor.slice(0, 2).join(', ') : ''}`);
  if (checkH) ok(Math.abs(bm.docH - m.docH) <= 4, `${key}: cao trang lệch ${Math.abs(bm.docH - m.docH)}px ≤ 4`);
};

const shot = async (p, sel, file) => {
  const loc = p.locator(sel).first(); if (!(await loc.count()) || !(await loc.isVisible())) return false;
  await loc.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(250);
  await loc.screenshot({ path: file }).catch(() => {}); return true;
};

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  const key = `${brn}-${fr}`;
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  await p.goto(BASE + URL_, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.evaluate(async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(1200);
  data[key] = await measure(p, [ZONES, CHROME]);
  for (const [sel, n] of [['#pc-bd-head', 'head'], ['.pc-bd-quote', 'quote'], ['.pc-bd-photo-note', 'photo-note'], ['#pc-bd-cta', 'cta'], ['.pc-cmp-prescription-widget', 'prescription'], ['.pc-art-side > .pc-art-widget:last-child', 'related']]) await shot(p, sel, `${OUT}/${MODE}-${brn}-${fr}-${n}.png`);
  if (['390', '1440', 'iphone13'].includes(fr)) await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-full.png`, fullPage: true });
  const st = {};
  // Thanh bám đáy: cuộn tới thẻ trích dẫn (đã qua thẻ đầu bài; thẻ CTA chưa vào màn hình ở mobile).
  await p.evaluate(() => { const q = document.querySelector('.pc-bd-quote'); if (q) window.scrollTo(0, q.getBoundingClientRect().top + window.scrollY - 80); });
  await p.waitForTimeout(800);
  st.sticky = await p.evaluate(() => { const b = document.getElementById('pc-bd-sticky'); return b ? b.classList.contains('is-visible') + '/' + b.getAttribute('aria-hidden') : null; });
  data[`${key}|sticky`] = await measure(p, [ZSTICKY, CHROME]);
  await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-sticky.png` });
  // Bàn phím: focus nút đặt lịch thẻ CTA, Shift+Tab rồi Tab quay lại ⇒ viền focus
  const cta = p.locator('#pc-bd-cta a').first();
  if (await cta.count()) {
    await cta.focus(); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
    st.ctaKb = await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { el: (a.textContent || '').trim().slice(0, 30), ow: c.outlineStyle === 'none' ? 0 : parseFloat(c.outlineWidth), oc: c.outlineColor, bs: c.boxShadow.slice(0, 30) }; });
    await shot(p, '#pc-bd-cta', `${OUT}/${MODE}-${brn}-${fr}-cta-focus.png`);
  }
  data[`${key}|state`] = st;
  const m = data[key], ms = data[`${key}|sticky`];
  console.log(`${key}: FA vùng ${m.fa}+${ms.fa} · ngoài vùng ${m.faPage.length} · icon nhìn thấy ${m.icons.filter((x) => x.vis).length}/${m.icons.length} · thanh đáy ${ms.icons.filter((x) => x.vis).length}/${ms.icons.length} · tương tác ${JSON.stringify(st)} · lỗi JS ${errs.length}${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`);
  if (MODE === 'after') {
    ok(m.fa === 0 && ms.fa === 0 && m.faPage.length === 0, `${key}: <i fa-> trong vùng = ${m.fa}+${ms.fa}, ngoài vùng (trừ khung chung) = ${m.faPage.length}${m.faPage.length ? ' — ' + m.faPage.slice(0, 3).join(' | ') : ''}`);
    ok(m.pcErr === 0, `${key}: PC-ERROR ui_icon = ${m.pcErr}`);
    if (before?.[key]) { compare(key, before[key], m, true); compare(`${key} thanh đáy`, before[`${key}|sticky`], ms, false); } else ok(false, `${key}: có số đo before`);
    const bs = JSON.stringify(before?.[`${key}|state`]), as = JSON.stringify(st);
    ok(bs === as, `${key}: tương tác before ${bs} = after ${as}`);
    const be = before?.[`${key}|errs`] || []; const nu = errs.filter((e) => !be.includes(e));
    ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`);
  }
  data[`${key}|errs`] = errs;
  await ctx.close(); await b.close();
}
const prev = process.argv[3] && fs.existsSync(`${OUT}/${MODE}.json`) ? JSON.parse(fs.readFileSync(`${OUT}/${MODE}.json`, 'utf8')) : {};
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify({ ...prev, ...data }, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
