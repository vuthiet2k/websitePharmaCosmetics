// L03b34 (vòng 101, 03/11/2026 — chạy lại: node ui-loop/checks/L03b34.mjs before|after).
// Việc: gỡ Font Awesome ở assets/quickview.js.bwt — link «Đánh giá» chèn bằng JS vào `.reviews_qv .text_revi` của popup
// xem nhanh. Popup không có markup `.reviews_qv` ⇒ check chèn tạm ô đó vào #quickview-modal (mẫu popup) trước khi bấm
// «Xem nhanh» để chạy đúng nhánh mã. Popup chỉ mở khi rộng > 1025 (quickview.js) ⇒ đo popup ở Chromium + WebKit 1440;
// 6 khung còn lại: bấm «Xem nhanh» ⇒ hành vi = before, 0 FA, 0 lỗi JS.
// Ảnh: ui-loop/evidence/L03b34/<mode>-<trình duyệt>-<khung>[-popup|-review].png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b34';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:3000/collections/all';
const mob = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const FRAMES = [
  ['chromium', '390', chromium, mob(390, 844)],
  ['webkit', 'iphone13', webkit, devices['iPhone 13']],
  ['chromium', '320', chromium, mob(320, 568)],
  ['chromium', '768', chromium, { viewport: { width: 768, height: 1024 } }],
  ['chromium', '1024', chromium, { viewport: { width: 1024, height: 768 } }],
  ['chromium', '1440', chromium, { viewport: { width: 1440, height: 900 } }],
  ['webkit', '1440', webkit, { viewport: { width: 1440, height: 900 } }],
  ['chromium', '844x390', chromium, mob(844, 390)],
];
const before = MODE === 'after' && fs.existsSync(`${OUT}/before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/before.json`, 'utf8')) : null;
const data = {}; const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✗'} ${msg}`); if (!cond) fails.push(msg); };
const r1 = (n) => Math.round(n * 10) / 10;

const popupState = (p) => p.evaluate(() => {
  const m = document.querySelector('#quick-view-product');
  const box = document.querySelector('.quick-view-product .block-quickview') || document.querySelector('.quick-view-product');
  const vis = m && getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().height > 0;
  const r = box ? box.getBoundingClientRect() : { width: 0, height: 0 };
  const q = (s) => (document.querySelector('.quick-view-product ' + s)?.textContent || '').trim().replace(/\s+/g, ' ');
  return { open: !!vis, w: r.width, h: r.height, name: q('.qwp-name'), price: q('.price') };
});

const reviewState = (p) => p.evaluate(() => {
  const qv = document.querySelector('.quick-view-product');
  const fa = [...document.querySelectorAll('i')].filter((i) => /(^|\s)fa-(solid|regular|brands)(\s|$)/.test(i.className)).length;
  const faQv = qv ? [...qv.querySelectorAll('i')].filter((i) => /(^|\s)fa-/.test(i.className)).length : 0;
  const tpl = document.querySelector('#pc-qv-pen-icon');
  const tplInfo = tpl ? { tag: tpl.tagName, svg: tpl.content ? tpl.content.querySelectorAll('svg').length : tpl.querySelectorAll('svg').length, rect: [tpl.getBoundingClientRect().width, tpl.getBoundingClientRect().height] } : null;
  const a = document.querySelector('.quick-view-product .reviews_qv .text_revi a');
  let icon = null;
  if (a) {
    const i = a.querySelector('i'); const svg = i?.querySelector('svg');
    const t = svg || i; const ir = t.getBoundingClientRect(); const ar = a.getBoundingClientRect();
    const cs = getComputedStyle(a); const ics = getComputedStyle(t);
    // tâm dọc dòng chữ = tâm dòng của nút text sau icon
    const rng = document.createRange(); const tn = [...a.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    let tr = ar; if (tn) { rng.selectNodeContents(tn); tr = rng.getBoundingClientRect(); }
    const isFa = /(^|\s)fa-/.test(i?.className || '');
    const before = isFa ? getComputedStyle(i, '::before') : null;
    icon = {
      text: a.textContent.replace(/ /g, ' ').trim(), href: a.getAttribute('href'),
      w: ir.width, h: ir.height, fontSize: parseFloat(cs.fontSize), linkColor: cs.color, iconColor: svg ? getComputedStyle(svg).color : ics.color,
      stroke: svg ? svg.getAttribute('stroke') : null, ariaHidden: i?.getAttribute('aria-hidden'),
      dy: (ir.top + ir.height / 2) - (tr.top + tr.height / 2), isFa, faContent: before ? before.content : null, faFont: before ? before.fontFamily : null,
    };
  }
  return { fa, faQv, tplInfo, icon, pcErr: document.documentElement.innerHTML.includes('PC-ERROR ui_icon') };
});

const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const dRGB = (a, b) => Math.max(...rgb(a).map((v, k) => Math.abs(v - rgb(b)[k])));

for (const [bn, fn, eng, opts] of FRAMES) {
  const key = `${bn}-${fn}`;
  const b = await eng.launch(); const ctx = await b.newContext(opts); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(800);
  const d = { errs };
  d.pageH = await p.evaluate(() => document.documentElement.scrollHeight);
  const st0 = await reviewState(p); d.tplInfo = st0.tplInfo; d.pcErr = st0.pcErr; d.faPage = st0.fa;
  const btn = p.locator('.quick-view').first();
  await btn.scrollIntoViewIfNeeded();
  const wide = (opts.viewport?.width || 0) > 1025;
  // Lượt 1: popup gốc (không chèn) — đo tên/giá/cao popup.
  const url0 = p.url();
  await btn.click({ force: true });
  await p.waitForTimeout(1500);
  d.plain = await popupState(p); d.urlAfterClick = p.url() === url0 ? 'same' : p.url();
  if (d.plain.open) {
    await p.screenshot({ path: `${OUT}/${MODE}-${bn}-${fn}-popup.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    d.escClosed = !(await popupState(p)).open;
    if (!d.escClosed) {
      const c = p.locator('#quick-view-product .quickview-close:visible, .quick-view-product .quickview-close:visible').first();
      d.closeVisible = (await c.count()) > 0;
      if (d.closeVisible) await c.click(); else await p.evaluate(() => document.querySelector('#quick-view-product .quickview-overlay')?.click());
      await p.waitForTimeout(600);
    }
    d.closeClosed = !(await popupState(p)).open;
  } else {
    await p.screenshot({ path: `${OUT}/${MODE}-${bn}-${fn}.png` });
  }
  // Lượt 2: chèn tạm ô .reviews_qv vào mẫu popup ⇒ chạy nhánh chèn link «Đánh giá».
  if (wide) {
    if (p.url() !== url0) { await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); }
    await p.evaluate(() => {
      const m = document.querySelector('#quickview-modal .qwp-name') || document.querySelector('#quickview-modal');
      const d = document.createElement('div'); d.className = 'reviews_qv'; d.innerHTML = '<span class="text_revi"></span>';
      m.after ? m.after(d) : m.appendChild(d);
    });
    await btn.click({ force: true });
    await p.waitForTimeout(1500);
    const st = await reviewState(p); d.review = st; d.faQv = st.faQv;
    const a = p.locator('.quick-view-product .reviews_qv .text_revi a');
    if (await a.count()) {
      await a.scrollIntoViewIfNeeded();
      const bb = await a.boundingBox();
      await p.screenshot({ path: `${OUT}/${MODE}-${bn}-${fn}-review.png`, clip: { x: Math.max(0, bb.x - 60), y: Math.max(0, bb.y - 40), width: Math.min(400, bb.width + 120), height: bb.height + 80 } });
    }
  }
  d.errs = errs;
  data[key] = d;
  console.log(key, JSON.stringify({ pageH: d.pageH, tpl: d.tplInfo, plain: d.plain, url: d.urlAfterClick, esc: d.escClosed, close: d.closeClosed, review: d.review && { faQv: d.review.faQv, icon: d.review.icon && { ...d.review.icon, w: r1(d.review.icon.w), h: r1(d.review.icon.h), dy: r1(d.review.icon.dy) } }, errs: errs.length }));
  await b.close();
}

fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify(data, null, 1));
if (MODE === 'after' && before) {
  for (const k of Object.keys(data)) {
    const a = data[k]; const bf = before[k]; if (!bf) continue;
    ok(!a.pcErr, `${k}: 0 PC-ERROR ui_icon`);
    ok(a.tplInfo && a.tplInfo.tag === 'TEMPLATE' && a.tplInfo.svg === 1 && a.tplInfo.rect[0] === 0 && a.tplInfo.rect[1] === 0, `${k}: #pc-qv-pen-icon <template> 1 svg, hộp 0×0 (${JSON.stringify(a.tplInfo)})`);
    ok(Math.abs(a.pageH - bf.pageH) <= 4, `${k}: cao trang ${bf.pageH} → ${a.pageH}`);
    ok(a.plain.open === bf.plain.open && a.urlAfterClick === bf.urlAfterClick, `${k}: bấm Xem nhanh — popup ${bf.plain.open}→${a.plain.open}, URL ${bf.urlAfterClick}→${a.urlAfterClick}`);
    if (a.plain.open) {
      ok(a.plain.name === bf.plain.name && a.plain.price === bf.plain.price, `${k}: tên/giá popup = before (${a.plain.name} · ${a.plain.price})`);
      ok(Math.abs(a.plain.h - bf.plain.h) <= 2 && Math.abs(a.plain.w - bf.plain.w) <= 2, `${k}: hộp popup ${r1(bf.plain.w)}×${r1(bf.plain.h)} → ${r1(a.plain.w)}×${r1(a.plain.h)}`);
      ok(a.escClosed === bf.escClosed && a.closeClosed === bf.closeClosed, `${k}: Escape ${bf.escClosed}→${a.escClosed}, nút đóng ${bf.closeClosed}→${a.closeClosed}`);
    }
    if (a.review) {
      const i = a.review.icon; const bi = bf.review?.icon;
      ok(bf.review.faQv >= 1 && a.review.faQv === 0, `${k}: <i fa-> trong popup ${bf.review.faQv} → ${a.review.faQv}`);
      ok(!!i && i.w > 0 && i.h > 0, `${k}: icon Đánh giá nhìn thấy ${i ? r1(i.w) + '×' + r1(i.h) : '—'} (before ${bi ? r1(bi.w) + '×' + r1(bi.h) + (bi.faFont ? ' font ' + bi.faFont.split(',')[0] : '') : '—'})`);
      if (i) {
        const ratio = i.h / i.fontSize;
        ok(ratio >= 0.6 && ratio <= 1.6, `${k}: cao icon / cỡ chữ link = ${r1(ratio * 100) / 100} (${r1(i.h)} / ${i.fontSize})`);
        ok(Math.abs(i.dy) <= 2, `${k}: lệch tâm dọc so dòng chữ ${r1(i.dy)}px`);
        ok(i.stroke === 'currentColor' && dRGB(i.iconColor, i.linkColor) <= 10, `${k}: nét currentColor, màu icon ${i.iconColor} vs link ${i.linkColor} ΔRGB ${dRGB(i.iconColor, i.linkColor)}`);
        ok(i.ariaHidden === 'true', `${k}: aria-hidden="true"`);
        ok(bi && i.text === bi.text && i.href === bi.href, `${k}: chữ/href link = before (${i.text} · ${i.href})`);
      }
    }
    ok(a.errs.length <= bf.errs.length, `${k}: lỗi JS ${bf.errs.length} → ${a.errs.length}`);
  }
  console.log(`\n${fails.length ? '✗ CHƯA ĐẠT' : '✔ ĐẠT'} — ${fails.length} lỗi`);
  process.exit(fails.length ? 1 : 0);
}
