// L03b36 (vòng 104, 09/11/2026 — chạy lại: node ui-loop/checks/L03b36.mjs before|after [khung,khung]).
// Việc: gỡ Font Awesome ở layouts/chat.bwt — avatar thanh trên (fa-microscope) + nút «Làm lại» (fa-rotate-right)
//   → ui_icon microscope / rotate-cw size em. Layout không template thật nào dùng ⇒ dựng ở trang chỉ dev
//   /?tpl=page.l03b36-chat (dev-preview/templates/page.l03b36-chat.bwt).
// Đo: mọi <i> có FA hoặc SVG con trong header.pc-chat-topbar (hộp glyph FA đo bằng span ẩn cùng font, như L03b8–L03b35).
// Tương tác: bấm nút làm lại ⇒ đếm sự kiện pc-chat-restart; Tab ×4 + Shift+Tab — chuỗi before = after.
// Ảnh: ui-loop/evidence/L03b36/<mode>-<trình duyệt>-<khung>.png (+ -topbar.png cận thanh trên)
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b36';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const URL_ = 'http://localhost:3000/?tpl=page.l03b36-chat';
const SCOPE = 'header.pc-chat-topbar';
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

const measure = (p, scope) => p.evaluate((scope) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0'; };
  const out = []; let fa = 0;
  const root = document.querySelector(scope);
  for (const i of root ? [...root.querySelectorAll('i')] : []) {
    const isFa = /(^|\s)fa-|(^|\s)fa[srb](\s|$)/.test(i.className); if (isFa) fa++;
    const svg = i.querySelector(':scope > svg');
    if (!isFa && !svg) continue;
    const t = svg || i; let r = t.getBoundingClientRect(); const par = i.parentElement; const pr = par.getBoundingClientRect();
    if (isFa) { const c = getComputedStyle(i); const cb = getComputedStyle(i, '::before'); const fs = parseFloat(cb.fontSize || c.fontSize); const lh = parseFloat(c.lineHeight) || fs;
      const s = document.createElement('span'); s.textContent = (cb.content || '').replace(/^"|"$/g, '');
      s.style.cssText = `position:absolute;left:-9999px;top:0;font-family:${cb.fontFamily};font-weight:${cb.fontWeight};font-size:${cb.fontSize};line-height:1;white-space:nowrap`;
      document.body.appendChild(s); const gw = s.getBoundingClientRect().width || r.width; s.remove();
      const line = Math.min(r.height, Math.max(lh, fs)); r = { x: r.x + (r.width - gw) / 2, y: r.y + (line - fs) / 2, width: gw, height: fs }; }
    const shapes = svg ? [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon')] : [];
    const filled = shapes.filter((e) => getComputedStyle(e).fill !== 'none' && !e.hasAttribute('fill')).length;
    out.push({ zone: String(par.className || par.tagName).split(' ')[0], cls: i.className, vis: vis(t) && vis(i), aria: i.getAttribute('aria-hidden') || svg?.getAttribute('aria-hidden'),
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
      filled, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null });
  }
  const faPage = [...document.querySelectorAll('i')].filter((i) => /(^|\s)fa-|(^|\s)fa[srb](\s|$)/.test(i.className)).map((i) => i.className);
  const tr = root?.getBoundingClientRect();
  return { icons: out, fa, faPage, bar: tr ? `${tr.width.toFixed(1)}x${tr.height.toFixed(1)}` : 'none', docH: document.documentElement.scrollHeight,
    pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length };
}, scope);
const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const focusSeq = async (p) => { const seq = [];
  await p.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
  for (let k = 0; k < 4; k++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return `${a.tagName}.${String(a.className).split(' ')[0]}:${c.outlineStyle === 'none' ? 0 : c.outlineWidth}`; })); }
  await p.keyboard.press('Shift+Tab'); seq.push('S:' + await p.evaluate(() => `${document.activeElement.tagName}.${String(document.activeElement.className).split(' ')[0]}`));
  return seq.join(' > '); };

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  const key = `${brn}-${fr}`;
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.goto(URL_, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForTimeout(1000);
  const m = await measure(p, SCOPE);
  await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}.png` });
  await p.locator(SCOPE).screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-topbar.png` }).catch(() => {});
  // Tab đo trên trang vừa nạp lại (trước mọi thao tác chạm/bấm) — điểm bắt đầu focus xác định.
  if (brn !== 'webkit') { await p.reload({ waitUntil: 'load' }); await p.evaluate(() => document.getElementById('dev-toolbar')?.remove()); await p.waitForTimeout(600); }
  m.focus = brn === 'webkit' ? 'bỏ (WebKit Tab không qua nút/link mặc định)' : await focusSeq(p);
  // Bấm nút làm lại ⇒ đếm sự kiện pc-chat-restart
  await p.evaluate(() => { window.__rs = 0; document.addEventListener('pc-chat-restart', () => { window.__rs++; }); });
  const btn = p.locator('.pc-chat-restart');
  const bb = await btn.boundingBox();
  m.btn = bb ? `${bb.width.toFixed(1)}x${bb.height.toFixed(1)}` : 'none';
  if (brn === 'webkit' || opt.hasTouch) await btn.tap().catch(async () => btn.click()); else await btn.click();
  await p.waitForTimeout(150);
  m.restart = await p.evaluate(() => window.__rs);
  m.errs = errs;
  data[key] = m;
  console.log(`${key}: FA thanh trên ${m.fa} · FA trang ${m.faPage.length} · icon nhìn thấy ${m.icons.filter((x) => x.vis).length}/${m.icons.length} · thanh ${m.bar} · nút ${m.btn} · cao trang ${m.docH} · sự kiện làm lại ${m.restart} · lỗi JS ${errs.length}`);
  m.icons.forEach((x) => console.log(`      ${x.zone} [${x.cls}] ${x.w}×${x.h} @${x.rx},${x.ry} cha ${x.pw}×${x.ph} màu ${x.color} tô ${x.filled}/${x.shapes} aria-hidden ${x.aria}`));
  console.log(`   focus: ${m.focus}`);
  if (MODE === 'after') {
    ok(m.fa === 0 && m.faPage.length === 0, `${key}: <i fa-> thanh trên ${m.fa} / toàn trang ${m.faPage.length}`);
    ok(m.pcErr === 0, `${key}: PC-ERROR ui_icon = ${m.pcErr}`);
    const bm = before?.[key];
    if (!bm) ok(false, `${key}: có số đo before`);
    else {
      const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
      ok(bv.length === 2 && av.length === bv.length, `${key}: icon nhìn thấy before ${bv.length} → after ${av.length}`);
      bv.forEach((x, k) => { const y = av[k]; if (!y) return;
        const d = Math.hypot(x.rx - y.rx, x.ry - y.ry); const pd = Math.max(Math.abs(x.pw - y.pw), Math.abs(x.ph - y.ph)); const rr = y.h / (x.h || 0.01);
        const a = rgb(x.color), c = rgb(y.color); const cd = Math.max(...a.map((v, j) => Math.abs(v - c[j])));
        ok(d <= 2, `${key} ${x.zone}: lệch tâm ${d.toFixed(1)}px ≤ 2 (${x.w}×${x.h} @${x.rx},${x.ry} → ${y.w}×${y.h} @${y.rx},${y.ry})`);
        ok(pd <= 4, `${key} ${x.zone}: phần tử cha ${x.pw}×${x.ph} → ${y.pw}×${y.ph} lệch ${pd.toFixed(1)} ≤ 4`);
        ok(rr >= 0.6 && rr <= 1.6, `${key} ${x.zone}: cao icon ${rr.toFixed(2)} × before`);
        ok(cd <= 10, `${key} ${x.zone}: màu ΔRGB ${cd} (${x.color} → ${y.color})`);
        ok(y.filled === 0 && y.stroke === y.color, `${key} ${x.zone}: nét currentColor, tô đặc ${y.filled}`);
        ok(y.aria === 'true', `${key} ${x.zone}: aria-hidden ${y.aria}`); });
      const [bw, bh] = bm.bar.split('x').map(Number), [aw, ah] = m.bar.split('x').map(Number);
      ok(Math.abs(bh - ah) <= 2 && Math.abs(bw - aw) <= 1, `${key}: thanh trên ${bm.bar} → ${m.bar}`);
      ok(Math.abs(bm.docH - m.docH) <= 4, `${key}: cao trang ${bm.docH} → ${m.docH}`);
      ok(m.restart === bm.restart && m.restart === 1, `${key}: bấm làm lại ⇒ sự kiện ${bm.restart} → ${m.restart}`);
      ok(bm.btn === m.btn || (() => { const [x1, y1] = bm.btn.split('x').map(Number), [x2, y2] = m.btn.split('x').map(Number); return Math.abs(x1 - x2) <= 4 && Math.abs(y1 - y2) <= 4; })(), `${key}: nút làm lại ${bm.btn} → ${m.btn} lệch ≤ 4px`);
      ok(bm.focus === m.focus, `${key}: chuỗi Tab ×4 + Shift+Tab before = after (${m.focus})`);
      const nu = errs.filter((e) => !(bm.errs || []).includes(e)); ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`);
    }
  }
  await ctx.close(); await b.close();
}
const prev = process.argv[3] && fs.existsSync(`${OUT}/${MODE}.json`) ? JSON.parse(fs.readFileSync(`${OUT}/${MODE}.json`, 'utf8')) : {};
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify({ ...prev, ...data }, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
