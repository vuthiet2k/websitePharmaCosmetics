// L03b6 (vòng 59, 31/10/2026 — chạy lại: node ui-loop/checks/L03b6.mjs before|after).
// Việc: gỡ Font Awesome ở TRANG LIỆU TRÌNH (snippets/lieu_trinh_*) — thay bằng ui_icon size 'em' trong <i> bọc cũ.
// 2 trang × 3 trạng thái: 'top' (đầu trang), 'mid' (cuộn giữa — thanh dính mobile), 'open' (FAQ mục 1 mở + popup chi tiết mở).
// Ảnh: ui-loop/evidence/L03b6/<mode>-<trình duyệt>-<khung>-<trang>-<trạng thái|vùng>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b6';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const PAGES = [
  ['gg', '/products/elaine-brennan-getglowing-micro-peel-lieu-trinh-peel-chuyen-nghiep-ho-tro-lam-sang-va-cai-thien-be-mat-da'],
  ['decaar', '/products/decaar-algae-peeling-regimen-vi-tao-sinh-tri-lieu-gen'],
  // Thêm khi sửa (vòng 59): danh mục liệu trình — thẻ lieu_trinh_card (icon đồng hồ thời gian).
  ['col', '/collections/dieu-tri-chuyen-nghiep'],
].filter(([k]) => !process.argv[3] || process.argv[3].split(',').includes(k));
const ZONES = ['.lt-page'];
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
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && e.checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) !== false; };
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
      const tf = getComputedStyle(i).transform;
      out.push({ zone: where, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*|fas\s*|inline-block\s*|leading-none\s*/g, '').trim(), vis: vis(t) && vis(i),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
        filled, shapes: shapes.length, color: getComputedStyle(t).color, stroke: svg ? getComputedStyle(svg).stroke : null, tf });
    }
  }
  return { icons: out, fa, docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length };
}, zones);

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const compare = (key, bm, m) => {
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
const SHOTS = [['hero', '#service-hero-section .lt-actions, #service-hero-section'], ['tech', '#service-mechanism-section'], ['cases', '#service-cases-section, .lt-cases'],
  ['info', '#service-booking-section'], ['faq', '.lt-faq__item'], ['card', '.lt-pcard:has(.lt-pcard__meta i)']];

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
    await p.waitForTimeout(1200);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await p.waitForTimeout(600);
    // 1) đầu trang
    const mTop = await measure(p, ZONES); data[`${key}-top`] = mTop;
    for (const [zn, sel] of SHOTS) await shot(p, sel, `${OUT}/${MODE}-${brn}-${fr}-${pk}-${zn}.png`);
    if (['390', '1440', 'iphone13'].includes(fr)) await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pk}-full.png`, fullPage: true });
    // 2) cuộn giữa — thanh dính mobile
    await p.evaluate(() => { const s = document.getElementById('service-steps-section') || document.body; scrollTo(0, s.getBoundingClientRect().top + scrollY); });
    await p.waitForTimeout(700);
    const mMid = await measure(p, ZONES); data[`${key}-mid`] = mMid;
    const sticky = await p.evaluate(() => { const s = document.getElementById('peel-mobile-sticky-cta'); if (!s) return null; const r = s.getBoundingClientRect(); return { on: document.body.classList.contains('lt-sticky-on'), top: Math.round(r.top), h: Math.round(r.height) }; });
    data[`${key}|sticky`] = sticky;
    if (sticky && sticky.top < (opt.viewport?.height || 844)) await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pk}-mid.png` });
    // 3) FAQ mục 1 mở + popup chi tiết mở
    const faq = p.locator('.lt-faq__item summary').first();
    let faqTf = null;
    if (await faq.count()) { await faq.scrollIntoViewIfNeeded(); await faq.click(); await p.waitForTimeout(300);
      faqTf = await p.evaluate(() => { const i = document.querySelector('.lt-faq__item summary i'); return i ? getComputedStyle(i).transform : null; });
      await shot(p, '.lt-faq__item', `${OUT}/${MODE}-${brn}-${fr}-${pk}-faq-open.png`); }
    data[`${key}|faqTf`] = faqTf;
    const more = p.locator('.lt-spec__more').first();
    let modal = null;
    if (await more.count() && await more.isVisible()) {
      await more.scrollIntoViewIfNeeded(); await shot(p, '.lt-spec__more', `${OUT}/${MODE}-${brn}-${fr}-${pk}-more.png`);
      await more.click(); await p.waitForTimeout(400);
      const mOpen = await measure(p, ZONES); data[`${key}-open`] = mOpen;
      await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pk}-modal.png` });
      const openNow = await p.evaluate(() => document.getElementById('lt-details-modal')?.open);
      await p.locator('.lt-modal__close').first().click(); await p.waitForTimeout(300);
      const closed = await p.evaluate(() => !document.getElementById('lt-details-modal')?.open);
      modal = { openNow, closed };
    }
    data[`${key}|modal`] = modal;
    // Bàn phím: Tab tới nút chính banner — viền focus, Enter mở đúng href
    await p.evaluate(() => scrollTo(0, 0));
    const cta = p.locator('#service-hero-section .lt-btn--primary:visible').first();
    let kb = null;
    if (await cta.count()) {
      await cta.focus();
      if (brn !== 'webkit') { await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); }
      const f = await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { txt: a.textContent.trim().slice(0, 50), cls: a.className, href: a.getAttribute('href'), ow: c.outlineStyle === 'none' ? 0 : parseFloat(c.outlineWidth), oc: c.outlineColor }; });
      await cta.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pk}-cta-focus.png` }).catch(() => {});
      await Promise.all([p.waitForURL((u) => u.href !== BASE + url, { timeout: 30000 }).catch(() => {}), p.keyboard.press('Enter')]);
      const u = new URL(p.url()); kb = { f, url: u.pathname + u.search };
      console.log(`   ${key} focus: ${JSON.stringify(f)} → Enter mở ${kb.url}`);
    }
    data[`${key}|kb`] = kb;
    console.log(`${key}: FA ${mTop.fa}/${mMid.fa}/${data[`${key}-open`]?.fa ?? '-'} · icon nhìn thấy ${mTop.icons.filter((x) => x.vis).length}/${mMid.icons.filter((x) => x.vis).length}/${data[`${key}-open`]?.icons.filter((x) => x.vis).length ?? '-'} · dính ${JSON.stringify(sticky)} · FAQ ${faqTf} · popup ${JSON.stringify(modal)} · lỗi JS ${errs.length}${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`);
    if (MODE === 'after') {
      for (const st of ['top', 'mid', 'open']) {
        const m = data[`${key}-${st}`]; if (!m) continue;
        ok(m.fa === 0, `${key}-${st}: <i fa-> trong .lt-page = ${m.fa}`);
        ok(m.pcErr === 0, `${key}-${st}: PC-ERROR ui_icon = ${m.pcErr}`);
        if (before?.[`${key}-${st}`]) compare(`${key}-${st}`, before[`${key}-${st}`], m);
      }
      const bs = before?.[`${key}|sticky`]; if (bs || sticky) ok(JSON.stringify(bs) === JSON.stringify(sticky), `${key}: thanh dính before ${JSON.stringify(bs)} = after ${JSON.stringify(sticky)}`);
      if (before?.[`${key}|faqTf`] !== undefined) ok(before[`${key}|faqTf`] === faqTf, `${key}: FAQ mở — chevron transform before ${before[`${key}|faqTf`]} = after ${faqTf}`);
      if (modal) ok(modal.openNow && modal.closed, `${key}: popup chi tiết mở ${modal.openNow}, bấm X đóng ${modal.closed}`);
      if (kb) {
        ok(/lt-btn--primary/.test(kb.f.cls) && (kb.f.ow >= 2 || brn === 'webkit'), `${key}: ${brn === 'webkit' ? 'focus()' : 'Tab'} tới «${kb.f.txt}» viền ${kb.f.ow}px ${kb.f.oc}`);
        const bk = before?.[`${key}|kb`]; ok(!bk || bk.url === kb.url, `${key}: Enter mở ${kb.url} (before ${bk?.url}, href ${kb.f.href})`);
      }
      const be = before?.[`${key}|errs`] || []; const nu = errs.filter((e) => !be.includes(e));
      ok(nu.length === 0, `${key}: lỗi JS mới ${nu.length}${nu.length ? ' — ' + nu.join(' | ') : ''}`);
    }
    data[`${key}|errs`] = errs;
    await ctx.close();
  }
  await b.close();
}
// Chạy riêng vài trang (đối số 3) ⇒ gộp vào file cũ, không xoá số đo các trang khác.
const prev = process.argv[3] && fs.existsSync(`${OUT}/${MODE}.json`) ? JSON.parse(fs.readFileSync(`${OUT}/${MODE}.json`, 'utf8')) : {};
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify({ ...prev, ...data }, null, 1));
if (MODE === 'after') { console.log(`\nKẾT QUẢ: ${fails.length ? 'CHƯA ĐẠT — ' + fails.length + ' mục ✗' : 'ĐẠT'}`); process.exit(fails.length ? 1 : 0); }
