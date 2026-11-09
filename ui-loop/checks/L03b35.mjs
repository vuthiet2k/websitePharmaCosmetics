// L03b35 (vòng 103, 04/11/2026 — chạy lại: node ui-loop/checks/L03b35.mjs before|after [khung,khung]).
// Việc: gỡ Font Awesome ở danh sách quyền lợi hạng thành viên (templates/page.loyalty.bwt, fa-circle-check) và gói đại lý
//   (templates/page.dai-ly-b2b.bwt, fa-check) → ui_icon circle-check / check size em. Nhánh chỉ dựng khi có settings hạng/gói
//   ⇒ dữ liệu MẪU local `?tiers=demo` (dev-server.js → preview-mock.js TIERS_DEMO_SETTINGS). Trang không ?tiers phải = before.
// Đo sau khi cuộn hết trang rồi về đầu: mỗi <li> quyền lợi — hộp icon (glyph FA đo bằng span ẩn cùng font), cỡ chữ dòng,
//   tâm dọc dòng chữ đầu (Range), mép trái chữ; cao từng thẻ; đếm <i fa-> toàn trang ngoài khung chung; Tab ×8 + Shift+Tab.
// Ảnh: ui-loop/evidence/L03b35/<mode>-<trình duyệt>-<khung>-<trang>[-grid].png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b35';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const BASE = 'http://localhost:3000';
// [khoá, url, chọn thẻ hạng/gói, demo?]
const PAGES = [
  ['loyalty', '/loyalty?tiers=demo', 'div.border-t-4', true],
  ['b2b', '/dai-ly-b2b?tiers=demo', 'div.grid.gap-6.mb-14 > div', true],
  ['loyalty-plain', '/loyalty', 'div.border-t-4', false],
  ['b2b-plain', '/dai-ly-b2b', 'div.grid.gap-6.mb-14 > div', false],
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

const measure = (p, chrome, cardSel) => p.evaluate(([chrome, cardSel]) => {
  const isFaRe = /(^|\s)fa-|(^|\s)fa[srb](\s|$)/;
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) !== false; };
  const cards = [...document.querySelectorAll(cardSel)];
  const items = []; let fa = 0;
  cards.forEach((card, ci) => {
    for (const li of card.querySelectorAll('li.flex.items-start')) {
      const i = li.querySelector('i'); const txt = [...li.children].find((e) => e.tagName === 'SPAN' && !e.querySelector('i'));
      if (!i || !txt) continue;
      const isFa = isFaRe.test(i.className); if (isFa) fa++;
      const svg = i.querySelector(':scope > svg');
      const t = svg || i; let r = t.getBoundingClientRect();
      if (isFa) { const c = getComputedStyle(i); const cb = getComputedStyle(i, '::before'); const fs = parseFloat(cb.fontSize || c.fontSize); const lh = parseFloat(c.lineHeight) || fs;
        const s = document.createElement('span'); s.textContent = (cb.content || '').replace(/^"|"$/g, '');
        s.style.cssText = `position:absolute;left:-9999px;top:0;font-family:${cb.fontFamily};font-weight:${cb.fontWeight};font-size:${cb.fontSize};line-height:1;white-space:nowrap`;
        document.body.appendChild(s); const gw = s.getBoundingClientRect().width || r.width; s.remove();
        const line = Math.min(r.height, Math.max(lh, fs)); r = { x: r.x, y: r.y + (line - fs) / 2, width: gw, height: fs }; }
      const rg = document.createRange(); const tn = txt.firstChild; let l1 = txt.getBoundingClientRect();
      if (tn && tn.nodeType === 3 && tn.length) { rg.setStart(tn, 0); rg.setEnd(tn, 1); l1 = rg.getClientRects()[0] || l1; }
      const lr = li.getBoundingClientRect(); const tr = txt.getBoundingClientRect();
      const fsLi = parseFloat(getComputedStyle(txt).fontSize);
      const shapes = svg ? [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon')] : [];
      const filled = shapes.filter((e) => getComputedStyle(e).fill !== 'none' && !e.hasAttribute('fill')).length;
      items.push({ card: ci, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|inline-block\s*|leading-none\s*/g, '').trim(), vis: vis(t) && vis(i),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1), fs: fsLi, ratio: +(r.height / fsLi).toFixed(2),
        dy: +((r.y + r.height / 2) - (l1.top + l1.height / 2)).toFixed(1), tx: +(tr.x - lr.x).toFixed(1), liH: +lr.height.toFixed(1),
        text: txt.textContent.trim(), aria: i.getAttribute('aria-hidden') || (svg && svg.getAttribute('aria-hidden')),
        filled, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null });
    }
  });
  const faPage = [...document.querySelectorAll('i')].filter((i) => !i.closest(chrome) && isFaRe.test(i.className)).map((i) => i.className);
  const h1 = document.querySelector('h1'); const hr = h1?.getBoundingClientRect();
  const upd = [...document.querySelectorAll('main p, main div, p')].find((e) => /đang được cập nhật/i.test(e.textContent) && e.children.length === 0);
  return { items, fa, faPage, cards: cards.map((c) => +c.getBoundingClientRect().height.toFixed(1)),
    h1: hr ? `${h1.textContent.trim().replace(/\s+/g, ' ')}|${hr.y.toFixed(1)}|${hr.height.toFixed(1)}` : 'none', upd: upd ? upd.textContent.trim().replace(/\s+/g, ' ').slice(0, 80) : 'none',
    docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length };
}, [chrome, cardSel]);

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const compare = (key, bm, m) => {
  const bv = bm.items.filter((x) => x.vis), av = m.items.filter((x) => x.vis);
  ok(bv.length >= 1 && av.length === bv.length, `${key}: icon nhìn thấy before ${bv.length} → after ${av.length}`);
  let dyMax = 0, rMin = 9, rMax = 0, colD = 0, colK = '', txD = 0, liD = 0;
  av.forEach((y, k) => { const x = bv[k]; dyMax = Math.max(dyMax, Math.abs(y.dy)); rMin = Math.min(rMin, y.ratio); rMax = Math.max(rMax, y.ratio);
    if (!x) return; txD = Math.max(txD, Math.abs(x.tx - y.tx)); liD = Math.max(liD, Math.abs(x.liH - y.liH));
    const a = rgb(x.color), b = rgb(y.color); const cd = Math.max(...a.map((v, i) => Math.abs(v - b[i]))); if (cd > colD) { colD = cd; colK = `${x.color} → ${y.color}`; } });
  av.slice(0, 3).forEach((y, k) => { const x = bv[k] || {}; console.log(`      [${x.cls}] ${x.w}×${x.h} dy ${x.dy} tx ${x.tx} li ${x.liH} ${x.color} → [${y.cls}] ${y.w}×${y.h} cao/cỡ ${y.ratio} dy ${y.dy} tx ${y.tx} li ${y.liH} ${y.color} tô ${y.filled}/${y.shapes}`); });
  ok(dyMax <= 2, `${key}: lệch tâm dọc icon so dòng chữ đầu ≤ 2px (đo max ${dyMax.toFixed(1)}; before max ${Math.max(...bv.map((x) => Math.abs(x.dy))).toFixed(1)})`);
  ok(rMin >= 0.6 && rMax <= 1.6, `${key}: cao icon 60–160 % cỡ chữ dòng (${rMin.toFixed(2)}–${rMax.toFixed(2)})`);
  ok(colD <= 10, `${key}: màu icon ΔRGB ${colD} ≤ 10 ${colK}`);
  ok(av.every((y) => !y.filled), `${key}: icon nét bị tô đặc = ${av.filter((y) => y.filled).length}`);
  ok(av.every((y) => !y.stroke || y.stroke === y.color), `${key}: icon vẽ bằng currentColor`);
  ok(av.every((y) => y.aria === 'true'), `${key}: aria-hidden=true ${av.filter((y) => y.aria === 'true').length}/${av.length}`);
  ok(txD <= 2, `${key}: chữ quyền lợi bắt đầu lệch ngang ≤ 2px (đo ${txD.toFixed(1)})`);
  ok(av.map((y) => y.text).join('|') === bv.map((x) => x.text).join('|'), `${key}: chữ quyền lợi = before`);
  const cD = Math.max(0, ...bm.cards.map((h, k) => Math.abs(h - (m.cards[k] ?? -99))));
  ok(bm.cards.length === m.cards.length && cD <= 4, `${key}: ${m.cards.length} thẻ, cao lệch ≤ 4px (đo ${cD.toFixed(1)}; ${bm.cards.join('/')} → ${m.cards.join('/')}; dòng li lệch ${liD.toFixed(1)})`);
};
const focusSeq = async (p) => { const seq = [];
  await p.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
  for (let k = 0; k < 8; k++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return `${a.tagName}:${(a.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24)}:${c.outlineStyle === 'none' ? 0 : c.outlineWidth}`; })); }
  await p.keyboard.press('Shift+Tab'); seq.push('S:' + await p.evaluate(() => (document.activeElement.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)));
  return seq.join(' > '); };

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  for (const [pg, url, cardSel, demo] of PAGES) {
    const key = `${brn}-${fr}-${pg}`;
    const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    p.on('dialog', (d) => d.dismiss().catch(() => {}));
    await p.goto(BASE + url, { waitUntil: 'load' });
    await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
    await p.evaluate(async () => { const H = document.documentElement.scrollHeight; for (let y = 0; y < H; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(1200);
    const m = await measure(p, CHROME, cardSel);
    if (demo) { const loc = p.locator(cardSel).first();
      if (await loc.count()) { await loc.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(200);
        await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pg}.png` });
        await loc.locator('xpath=..').screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pg}-grid.png` }).catch(() => {}); } }
    m.focus = brn === 'webkit' ? 'bỏ (WebKit Tab không qua link)' : await focusSeq(p);
    m.errs = errs;
    data[key] = m;
    console.log(`${key}: FA lưới ${m.fa} · FA trang ${m.faPage.length} (${m.faPage.join(' | ')}) · icon nhìn thấy ${m.items.filter((x) => x.vis).length}/${m.items.length} · thẻ ${m.cards.join('/')} · h1 ${m.h1} · cập nhật ${m.upd} · cao ${m.docH} · lỗi JS ${errs.length}`);
    console.log(`   focus: ${m.focus}`);
    if (MODE === 'after') {
      ok(m.fa === 0 && m.faPage.length === 0, `${key}: <i fa-> lưới ${m.fa} / toàn trang ngoài khung chung ${m.faPage.length}`);
      ok(m.pcErr === 0, `${key}: PC-ERROR ui_icon = ${m.pcErr}`);
      const bm = before?.[key];
      if (bm) {
        if (demo) compare(key, bm, m);
        else ok(bm.upd === m.upd && m.items.length === 0, `${key}: không ?tiers — thông báo «${m.upd}» = before, 0 quyền lợi`);
        ok(Math.abs(bm.docH - m.docH) <= 4, `${key}: cao trang ${bm.docH} → ${m.docH} lệch ${Math.abs(bm.docH - m.docH)}px ≤ 4`);
        ok(bm.h1 === m.h1, `${key}: h1 before = after (${m.h1})`);
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
