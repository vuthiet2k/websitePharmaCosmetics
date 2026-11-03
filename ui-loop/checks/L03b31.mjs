// L03b31 (vòng 98, 03/11/2026 — chạy lại: node ui-loop/checks/L03b31.mjs before|after [khung,khung]).
// Việc: gỡ Font Awesome ở 2 nhãn đầu trang hiện sẵn ở local (không cần dữ liệu mẫu):
//   templates/page.loyalty.bwt dòng 18 (nhãn «LOYALTY REWARDS», fa-gift) và templates/page.dai-ly-b2b.bwt dòng 17
//   (nhãn «ĐẠI LÝ PHÂN PHỐI B2B», fa-handshake) → ui_icon gift / handshake size em (ui_icon không đổi).
//   2 lượt còn lại của 2 template (circle-check quyền lợi hạng, check gói đại lý) chỉ hiện khi có dữ liệu — phần sau.
// Đo sau khi cuộn hết trang rồi về đầu: mọi <i> trong nhãn + đếm <i fa-> toàn trang ngoài khung chung.
// Tương tác: chữ + cỡ nhãn, h1; Tab 8 lần từ đầu trang + Shift+Tab — chuỗi phần tử nhận focus before = after.
// Ảnh: ui-loop/evidence/L03b31/<mode>-<trình duyệt>-<khung>-<trang>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b31';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const BASE = 'http://localhost:3000';
const PAGES = [
  ['loyalty', '/loyalty', 'section .pc-kit-badge-gold'],
  ['b2b', '/dai-ly-b2b', '.pc-kit-badge-clinical'],
];
const CHROME = 'header.header, .site-header, footer, #footer, .pc-bottom-nav, .pc-bottomnav, .main-widget, .site-topbar, [class*="topbar"], .ajaxcart, #dev-toolbar, .breadcrumb, .bread-crumb, .header, #header, .main-header, .mobile-menu, .menu_mobile, .pc-fab, .backtop, .modal, .popup';
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

// Hàm đo giống L03b8–L03b30: glyph FA đo bằng span ẩn cùng font/ký tự ::before (hộp <i> có thể bị flex kéo giãn).
const measure = (p, chrome, scope) => p.evaluate(([chrome, scope]) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) !== false; };
  const out = []; let fa = 0;
  const root = document.querySelector(scope);
  const inScope = root ? [...root.querySelectorAll('i')] : [];
  for (const i of inScope) {
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
    const where = (par.className && String(par.className).split(' ')[0]) || par.tagName.toLowerCase();
    out.push({ zone: where, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|fa[srb]\s+|inline-block\s*|leading-none\s*/g, '').trim(), vis: vis(t) && vis(i),
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
      filled, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null });
  }
  const faPage = [...document.querySelectorAll('i')].filter((i) => !i.closest(chrome) && /(^|\s)fa-|(^|\s)fa[srb](\s|$)/.test(i.className)).map((i) => i.className);
  const h1 = document.querySelector('h1'); const hr = h1?.getBoundingClientRect();
  return { icons: out, fa, faPage, badge: root ? `${(root.textContent || '').trim().replace(/\s+/g, ' ')}|${root.getBoundingClientRect().width.toFixed(1)}x${root.getBoundingClientRect().height.toFixed(1)}` : 'none',
    h1: hr ? `${h1.textContent.trim().replace(/\s+/g, ' ')}|${hr.y.toFixed(1)}|${hr.height.toFixed(1)}` : 'none',
    docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length };
}, [chrome, scope]);

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const compare = (key, bm, m) => {
  const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
  ok(bv.length >= 1 && av.length >= bv.length, `${key}: icon nhìn thấy trong nhãn before ${bv.length} → after ${av.length}`);
  let worst = 0, minR = 9, maxR = 0, parD = 0, colD = 0, colK = '';
  bv.forEach((x, i) => { const y = av[i]; if (!y) return;
    worst = Math.max(worst, Math.hypot(x.rx - y.rx, x.ry - y.ry));
    parD = Math.max(parD, Math.abs(x.pw - y.pw), Math.abs(x.ph - y.ph));
    const rr = (y.h || 0.01) / (x.h || 0.01); minR = Math.min(minR, rr); maxR = Math.max(maxR, rr);
    const a = rgb(x.color), b = rgb(y.color); const cd = Math.max(...a.map((v, k) => Math.abs(v - b[k]))); if (cd > colD) { colD = cd; colK = `${x.color} → ${y.color}`; } });
  const badFill = av.filter((y) => y.filled).length;
  const badColor = av.filter((y) => y.stroke && y.stroke !== y.color).length;
  bv.forEach((x, i) => { const y = av[i] || {}; console.log(`      ${x.zone} [${x.cls}] ${x.w}×${x.h} @${x.rx},${x.ry} cha ${x.pw}×${x.ph} màu ${x.color} → [${y.cls}] ${y.w}×${y.h} @${y.rx},${y.ry} cha ${y.pw}×${y.ph} màu ${y.color} tô ${y.filled}/${y.shapes}`); });
  ok(worst <= 2, `${key}: lệch tâm icon trong nhãn ≤ 2px (đo ${worst.toFixed(1)})`);
  ok(parD <= 4, `${key}: cỡ nhãn chứa icon đổi ≤ 4px (đo ${parD.toFixed(1)})`);
  ok(minR >= 0.6 && maxR <= 1.6, `${key}: cao icon 60–160 % before (${minR.toFixed(2)}–${maxR.toFixed(2)})`);
  ok(colD <= 10, `${key}: màu icon ΔRGB ${colD} ≤ 10 ${colK}`);
  ok(badFill === 0, `${key}: icon nét bị tô đặc = ${badFill}`);
  ok(badColor === 0, `${key}: icon vẽ bằng currentColor (${av.length - badColor}/${av.length})`);
  ok(Math.abs(bm.docH - m.docH) <= 4, `${key}: cao trang ${bm.docH} → ${m.docH} lệch ${Math.abs(bm.docH - m.docH)}px ≤ 4`);
  ok(bm.h1 === m.h1, `${key}: h1 chữ/vị trí/cao before ${bm.h1} = after ${m.h1}`);
  const [bt, bs] = bm.badge.split('|'), [at, as] = m.badge.split('|'); const [bw, bh] = bs.split('x').map(Number), [aw, ah] = as.split('x').map(Number);
  ok(bt === at && Math.abs(bw - aw) <= 4 && Math.abs(bh - ah) <= 4, `${key}: nhãn chữ trùng, cỡ ${bs} → ${as} lệch ≤ 4px`);
};
const focusSeq = async (p) => { const seq = [];
  await p.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
  for (let k = 0; k < 8; k++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return `${a.tagName}:${(a.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24)}:${c.outlineStyle === 'none' ? 0 : c.outlineWidth}`; })); }
  await p.keyboard.press('Shift+Tab'); seq.push('S:' + await p.evaluate(() => (document.activeElement.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)));
  return seq.join(' > '); };

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  for (const [pg, url, badge] of PAGES) {
    const key = `${brn}-${fr}-${pg}`;
    const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    p.on('dialog', (d) => d.dismiss().catch(() => {}));
    await p.goto(BASE + url, { waitUntil: 'load' });
    await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
    await p.evaluate(async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(1200);
    const m = await measure(p, CHROME, badge);
    const loc = p.locator(badge).first();
    if (await loc.count()) { await loc.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(200);
      await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pg}.png` });
      await loc.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pg}-badge.png` }).catch(() => {}); }
    m.focus = brn === 'webkit' ? 'bỏ (WebKit Tab không qua link)' : await focusSeq(p);
    m.errs = errs;
    data[key] = m;
    console.log(`${key}: FA nhãn ${m.fa} · FA trang ${m.faPage.length} (${m.faPage.join(' | ')}) · icon nhìn thấy ${m.icons.filter((x) => x.vis).length}/${m.icons.length} · nhãn ${m.badge} · h1 ${m.h1} · cao ${m.docH} · lỗi JS ${errs.length}`);
    console.log(`   focus: ${m.focus}`);
    if (MODE === 'after') {
      ok(m.fa === 0 && m.faPage.length === 0, `${key}: <i fa-> nhãn ${m.fa} / toàn trang ngoài khung chung ${m.faPage.length}`);
      ok(m.pcErr === 0, `${key}: PC-ERROR ui_icon = ${m.pcErr}`);
      const bm = before?.[key];
      if (bm) { compare(key, bm, m);
        ok(bm.focus === m.focus, `${key}: chuỗi Tab ×8 + Shift+Tab before = after`);
        const nu = errs.filter((e) => !(bm.errs || []).includes(e)); ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`); }
      else ok(false, `${key}: có số đo before`);
    }
    await ctx.close();
  }
  await b.close();
}
const prev = process.argv[3] && fs.existsSync(`${OUT}/${MODE}.json`) ? JSON.parse(fs.readFileSync(`${OUT}/${MODE}.json`, 'utf8')) : {};
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify({ ...prev, ...data }, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
