// N27 — viền focus chung toàn site: đo màu / độ rộng viền focus và tương phản với nền liền kề ở 4 trang × 8 khung.
// (1) Tab thật 40 lần (WebKit dùng Alt+Tab như Option+Tab Safari) — đo từng phần tử nhận focus;
// (2) sau 1 lần Tab, focus lần lượt MỌI phần tử bấm được nhìn thấy (kể cả footer) — đo viền :focus-visible.
// Nền liền kề = nền đặc của tổ tiên gần nhất (viền nằm ngoài phần tử); gặp ảnh nền trước ⇒ ghi "trên ảnh", không tính.
// Chạy: node ui-loop/checks/N27.mjs before|after   → ui-loop/evidence/N27/<mode>.json + ảnh after-*.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const BASE = 'http://localhost:3000';
const PAGES = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/dat-lich-tu-van'];
const OUT = 'ui-loop/evidence/N27'; fs.mkdirSync(OUT, { recursive: true });
const VPS = [
  ['chromium', '390', { viewport: { width: 390, height: 844 } }],
  ['webkit', '390', { ...devices['iPhone 13'] }],
  ['chromium', '320', { viewport: { width: 320, height: 568 } }],
  ['chromium', '768', { viewport: { width: 768, height: 1024 } }],
  ['chromium', '1024', { viewport: { width: 1024, height: 768 } }],
  ['chromium', '1440', { viewport: { width: 1440, height: 900 } }],
  ['webkit', '1440', { viewport: { width: 1440, height: 900 } }],
  ['chromium', '844x390', { viewport: { width: 844, height: 390 } }],
];
const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
const blend = (c, bg) => { const f = c.match(/[\d.]+/g).map(Number), g = bg.match(/[\d.]+/g).map(Number); const al = f.length > 3 ? f[3] : 1; return `rgb(${[0, 1, 2].map((i) => Math.round(f[i] * al + g[i] * (1 - al))).join(', ')})`; };
const ratio = (a, b) => { const x = lum(blend(a, b)), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// chạy trong trang: đo phần tử đang focus
const MEASURE = (el) => {
  const a = el || document.activeElement; if (!a || a === document.body) return null;
  const s = getComputedStyle(a); const r = a.getBoundingClientRect();
  let bg = 'rgba(0, 0, 0, 0)', img = false, n = a.parentElement;
  while (n) { const cs = getComputedStyle(n); if (cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) { img = true; break; } const b = cs.backgroundColor; if (!/rgba\(0, 0, 0, 0\)|transparent/.test(b) && !/, 0\)$/.test(b)) { bg = b; break; } n = n.parentElement; }
  if (!img && /rgba\(0, 0, 0, 0\)/.test(bg)) bg = 'rgb(255, 255, 255)';
  const cls = typeof a.className === 'string' ? a.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
  return { sel: a.tagName.toLowerCase() + (cls ? '.' + cls : ''), txt: (a.innerText || a.getAttribute('aria-label') || a.value || '').trim().slice(0, 30), st: s.outlineStyle, w: parseFloat(s.outlineWidth) || 0, col: s.outlineColor, bg, img, fv: a.matches(':focus-visible'), foot: !!a.closest('footer, .footer'), vis: r.width > 0 && r.height > 0 };
};
const judge = (m) => {
  const has = m.st !== 'none' && m.w > 0;
  const cr = has && !m.img ? +ratio(m.col, m.bg).toFixed(2) : null;
  const green = /rgb\(60, 179, 113\)/.test(m.col);
  const light = !m.img && lum(m.bg) > 0.5;
  return { ...m, has, cr, bad3CB: has && green && light && cr < 3, badRing: has && !m.img && (m.w < 2 || cr < 3) };
};

const result = {}; const summary = [];
for (const [bn, vn, ctxOpt] of VPS) {
  const browser = await (bn === 'webkit' ? webkit : chromium).launch();
  const ctx = await browser.newContext(ctxOpt);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const key = bn === 'webkit' ? 'Alt+Tab' : 'Tab';
  for (const url of PAGES) {
    // máy đo chậm (N25): chờ DOM, rồi chờ load tối đa 60s
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(1000);
    // (1) Tab thật
    const tabbed = [];
    for (let i = 0; i < 40; i++) { await page.keyboard.press(key); const m = await page.evaluate(MEASURE); if (m) tabbed.push(judge(m)); }
    // Shift+Tab lùi 1 bước phải về phần tử trước
    const before = tabbed.at(-2)?.sel; await page.keyboard.press('Shift+' + key); const back = (await page.evaluate(MEASURE))?.sel;
    // (2) focus từng phần tử nhìn thấy
    const all = (await page.evaluate((MS) => {
      const f = new Function('return ' + MS)();
      const els = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.disabled; });
      return els.map((e) => { e.focus({ preventScroll: true }); return document.activeElement === e ? f(e) : null; }).filter(Boolean);
    }, MEASURE.toString())).map(judge);
    const fvAll = all.filter((m) => m.fv);
    const rec = {
      tab: { n: tabbed.length, withRing: tabbed.filter((m) => m.has).length, bad3CB: tabbed.filter((m) => m.bad3CB).length, badRing: tabbed.filter((m) => m.badRing).map((m) => `${m.sel} «${m.txt}» ${m.w}px ${m.col} / ${m.bg} ${m.cr}`) },
      all: { n: all.length, fv: fvAll.length, withRing: fvAll.filter((m) => m.has).length, bad3CB: fvAll.filter((m) => m.bad3CB).length, badRing: fvAll.filter((m) => m.badRing).length, onImg: fvAll.filter((m) => m.has && m.img).length,
        foot: fvAll.filter((m) => m.foot).length, footRing: fvAll.filter((m) => m.foot && m.has).length, footMinCr: Math.min(...fvAll.filter((m) => m.foot && m.cr != null).map((m) => m.cr)),
        badSamples: [...new Set(fvAll.filter((m) => m.badRing).map((m) => `${m.sel} «${m.txt}» ${m.w}px ${m.col} / ${m.bg} = ${m.cr}`))].slice(0, 8),
        colors: Object.entries(fvAll.filter((m) => m.has).reduce((o, m) => { const k = `${m.w}px ${m.col}`; o[k] = (o[k] || 0) + 1; return o; }, {})) },
      shiftTab: before === back, jsErr: errs.length,
    };
    result[`${bn}-${vn} ${url}`] = rec;
    summary.push(`${bn}-${vn} ${url}: Tab ${rec.tab.withRing}/${rec.tab.n} có viền, 3CB-nền-sáng ${rec.tab.bad3CB}, viền<3:1 ${rec.tab.badRing.length} | toàn trang fv ${rec.all.fv}: có viền ${rec.all.withRing}, 3CB-nền-sáng ${rec.all.bad3CB}, viền<2px/<3:1 ${rec.all.badRing}, trên ảnh ${rec.all.onImg}, footer ${rec.all.footRing}/${rec.all.foot} min ${rec.all.footMinCr} | Shift+Tab ${rec.shiftTab ? 'đúng' : 'SAI'} | lỗi JS ${errs.length}`);
    // ảnh: /collections/all — link topbar, logo nền trắng, link footer; / — thẻ khối tối .shb2 (#003F2D)
    const SHOTS = url === '/collections/all' ? [['header', 'header.header a[href]:not([href="#"])'], ['logo', 'header.header a.logo-wrapper'], ['footer', 'footer a[href], .footer a[href]']]
      : url === '/' ? [['darkzone', '.dark-zone a.shb2__cta, .dark-zone a[href]']] : [];
    if (MODE === 'after') {
      for (const [tag, sel] of SHOTS) {
        // cuộn tức thì (trang có scroll-behavior: smooth), ẩn thanh dev (#dev-toolbar, chỉ có ở preview), đo toạ độ SAU khi dừng
        const ok = await page.evaluate((sel) => { const t = document.getElementById('dev-toolbar'); if (t) t.style.display = 'none'; const e = [...document.querySelectorAll(sel)].find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(x).visibility !== 'hidden'; }); if (!e) return false; document.documentElement.style.scrollBehavior = 'auto'; e.scrollIntoView({ block: 'center', behavior: 'instant' }); e.setAttribute('data-n27-shot', ''); return true; }, sel);
        if (!ok) continue; await page.waitForTimeout(600);
        const box = await page.evaluate(() => { const e = document.querySelector('[data-n27-shot]'); e.removeAttribute('data-n27-shot'); e.focus({ preventScroll: true }); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
        await page.waitForTimeout(250);
        const W = ctxOpt.viewport?.width || 390, H = ctxOpt.viewport?.height || 844;
        const x = Math.max(0, box.x - 60), y = Math.max(0, box.y - 40);
        if (y >= H - 4 || x >= W - 4) { await page.screenshot({ path: `${OUT}/after-${bn}-${vn}-${tag}.png` }); continue; }
        await page.screenshot({ path: `${OUT}/after-${bn}-${vn}-${tag}.png`, clip: { x, y, width: Math.min(box.w + 120, W - x), height: Math.min(box.h + 80, H - y) } });
      }
    }
  }
  await browser.close();
}
fs.writeFileSync(`${OUT}/${MODE}.json`, JSON.stringify(result, null, 1));
console.log(summary.join('\n'));
