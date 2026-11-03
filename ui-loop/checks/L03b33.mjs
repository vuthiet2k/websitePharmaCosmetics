// L03b33 (vòng 100, 03/11/2026 — chạy lại: node ui-loop/checks/L03b33.mjs before|after [khung,khung]).
// Việc: gỡ Font Awesome ở snippets/section_why_us.bwt (3 icon từ settings home_why_1/2/3_icon, mặc định fa-user-doctor / fa-certificate / fa-flask
//   → ui_icon size em: stethoscope / badge-check / flask-conical). Khối không nằm trong valid_sections của home_portal (không trang nào dựng).
// Dựng ở trang CHỈ dev /?tpl=index.l03b33 (dev-preview/templates/index.l03b33.bwt).
// Đo sau khi cuộn hết trang rồi về đầu: mọi <i> trong khối; nút CTA (chữ, cỡ, href, outline khi Tab tới).
// Ảnh: ui-loop/evidence/L03b33/<mode>-<trình duyệt>-<khung>[-khối].png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b33';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const URL = 'http://localhost:3000/?tpl=index.l03b33';
const SCOPES = ['#section_why_us'];
const BTNS = [['cta', '#section_why_us a.pc-why-us-cta']];
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

// Hàm đo giống L03b8–L03b32: glyph FA đo bằng span ẩn cùng font/ký tự ::before (hộp <i> có thể bị flex kéo giãn).
const measure = (p, scopes, btns) => p.evaluate(([scopes, btns]) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) !== false; };
  const out = []; let fa = 0;
  for (const sc of scopes) { const root = document.querySelector(sc); if (!root) continue;
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
      const filledAttr = shapes.filter((e) => e.getAttribute('fill') === 'currentColor').length;
      const filledBad = shapes.filter((e) => getComputedStyle(e).fill !== 'none' && !e.hasAttribute('fill')).length;
      const where = sc.slice(1) + ':' + ((par.className && String(par.className).split(' ')[0]) || par.tagName.toLowerCase());
      out.push({ zone: where, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|fa[srb]\s+|inline-block\s*|inline-flex\s*|leading-none\s*/g, '').trim(), vis: vis(t) && vis(i),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
        filledAttr, filledBad, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null });
    } }
  const b = {}; for (const [k, s] of btns) { const e = document.querySelector(s); const r = e?.getBoundingClientRect();
    b[k] = e ? { text: e.textContent.trim().replace(/\s+/g, ' '), w: +r.width.toFixed(1), h: +r.height.toFixed(1), href: e.getAttribute('href') } : null; }
  return { icons: out, fa, btns: b, docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length };
}, [scopes, btns]);

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const compare = (key, bm, m) => {
  const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
  ok(bv.length >= 3 && av.length >= bv.length, `${key}: icon nhìn thấy before ${bv.length} → after ${av.length} (≥ 3)`);
  let worst = 0, worstK = '', minR = 9, maxR = 0, parD = 0, colD = 0, colK = '';
  bv.forEach((x, i) => { const y = av[i]; if (!y) return;
    const d = Math.hypot(x.rx - y.rx, x.ry - y.ry); if (d > worst) { worst = d; worstK = x.zone; }
    parD = Math.max(parD, Math.abs(x.pw - y.pw), Math.abs(x.ph - y.ph));
    const rr = (y.h || 0.01) / (x.h || 0.01); minR = Math.min(minR, rr); maxR = Math.max(maxR, rr);
    const a = rgb(x.color), b = rgb(y.color); const cd = Math.max(...a.map((v, k) => Math.abs(v - b[k]))); if (cd > colD) { colD = cd; colK = `${x.color} → ${y.color}`; } });
  const badLine = av.filter((y) => y.filledAttr || y.filledBad || !y.shapes).length;
  const badColor = av.filter((y) => y.stroke && y.stroke !== 'none' && y.stroke !== y.color).length;
  bv.forEach((x, i) => { const y = av[i] || {};
    console.log(`      ${x.zone} [${x.cls}] ${x.w}×${x.h} @${x.rx},${x.ry} cha ${x.pw}×${x.ph} màu ${x.color} → [${y.cls}] ${y.w}×${y.h} @${y.rx},${y.ry} cha ${y.pw}×${y.ph} màu ${y.color} hình ${y.shapes}`); });
  ok(worst <= 2, `${key}: lệch tâm icon trong ô ≤ 2px (đo ${worst.toFixed(1)} ${worstK})`);
  ok(parD <= 4, `${key}: ô icon đổi cỡ ≤ 4px (đo ${parD.toFixed(1)})`);
  ok(minR >= 0.6 && maxR <= 1.6, `${key}: cao icon 60–160 % before (${minR.toFixed(2)}–${maxR.toFixed(2)})`);
  ok(colD <= 10, `${key}: màu icon ΔRGB ${colD} ≤ 10 ${colK}`);
  ok(av.length === 3 && badLine === 0, `${key}: icon nét không tô đặc ${av.length - badLine}/${av.length} (cần 3)`);
  ok(badColor === 0, `${key}: icon vẽ bằng currentColor (${av.length - badColor}/${av.length})`);
  ok(Math.abs(bm.docH - m.docH) <= 4, `${key}: cao trang ${bm.docH} → ${m.docH} lệch ${Math.abs(bm.docH - m.docH)}px ≤ 4`);
  for (const [k] of BTNS) { const x = bm.btns[k], y = m.btns[k];
    ok(x && y && x.text === y.text && x.href === y.href && Math.abs(x.w - y.w) <= 1 && Math.abs(x.h - y.h) <= 1, `${key}: nút ${k} «${y?.text}» ${x?.w}×${x?.h} → ${y?.w}×${y?.h} (≤ 1px), href = before`); }
};
const btnFocus = async (p) => { const r = {};
  for (const [k, s] of BTNS) {
    await p.evaluate((s) => { const e = document.querySelector(s); document.activeElement?.blur();
      // Tab thật tới nút: đặt điểm bắt đầu ngay trước nút rồi bấm Tab
      const t = document.createElement('button'); t.id = '__l33_start'; t.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px'; e.parentNode.insertBefore(t, e); t.focus(); }, s);
    await p.keyboard.press('Tab');
    r[k] = await p.evaluate((s) => { const a = document.activeElement; const e = document.querySelector(s); const c = getComputedStyle(a);
      const out = `${a === e ? 'trúng' : 'trượt:' + a.tagName}:${c.outlineStyle}:${c.outlineWidth}:${c.outlineColor}`; document.getElementById('__l33_start')?.remove(); return out; }, s);
  }
  return r; };

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  const key = `${brn}-${fr}`;
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.evaluate(async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(1200);
  const m = await measure(p, SCOPES, BTNS);
  for (const sc of SCOPES) { const loc = p.locator(sc).first(); if (await loc.count()) { await loc.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(150);
    await loc.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${sc.slice(1)}.png` }).catch(() => {}); } }
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(150);
  await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}.png`, fullPage: true });
  m.focus = await btnFocus(p);
  m.errs = errs;
  data[key] = m;
  console.log(`${key}: FA khối ${m.fa} · icon nhìn thấy ${m.icons.filter((x) => x.vis).length}/${m.icons.length} · nút ${JSON.stringify(m.btns)} · cao ${m.docH} · PC-ERROR ${m.pcErr} · lỗi JS ${errs.length}`);
  console.log(`   focus: ${JSON.stringify(m.focus)}`);
  if (MODE === 'after') {
    ok(m.fa === 0, `${key}: <i fa-> trong #section_why_us = ${m.fa}`);
    ok(m.pcErr === 0, `${key}: PC-ERROR ui_icon = ${m.pcErr}`);
    const bm = before?.[key];
    if (bm) { compare(key, bm, m);
      ok(JSON.stringify(bm.focus) === JSON.stringify(m.focus), `${key}: Tab tới nút CTA (outline) = before`);
      const nu = errs.filter((e) => !(bm.errs || []).includes(e)); ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`); }
    else ok(false, `${key}: có số đo before`);
  }
  await ctx.close();
  await b.close();
}
const prev = process.argv[3] && fs.existsSync(`${OUT}/${MODE}.json`) ? JSON.parse(fs.readFileSync(`${OUT}/${MODE}.json`, 'utf8')) : {};
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify({ ...prev, ...data }, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
