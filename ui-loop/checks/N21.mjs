// N21 (vòng 39, 30/10/2026 — chạy lại: node ui-loop/checks/N21.mjs before|after).
// Tiêu chí (BACKLOG): 6 trang Q × Chromium 390 + 1440 + WebKit iPhone 13 (thêm 320/768/1024/844×390 Chromium):
// 0 phần tử chữ nhìn thấy có computed font-weight ngoài 400–700. Kèm đo bề rộng chữ các phần tử từng đặt 300/800 — sau N19
// chỉ còn file 400/500/600/700 nên 300 vẽ bằng 400, 800 vẽ bằng 700 ⇒ đổi giá trị 300→400, 800→700 phải giữ nguyên bề rộng
// (cùng mặt font) — "after" so với "before".json. Ảnh: ui-loop/evidence/N21/<mode>-<khung>-<trang>.png.
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/N21';
const BASE = 'http://localhost:3000';
const PAGES = [['home', '/?tpl=index'], ['coll', '/collections/all'], ['pdp', '/products/serum-vitamin-c-15'], ['cart', '/?tpl=cart'], ['booking', '/dat-lich-tu-van'], ['login', '/?tpl=login']];
const TARGETS = {
  home: ['h1.portal-hero__title', 'a.portal-hero__btn', '.pc-flashsale__title-text em', '.pc-flashsale__badge', '.pc-brand__name'],
  coll: ['.pc-vouchers__title', '.pc-voucher__badge strong', '.pc-voucher__code', '.pc-filter-head__title', '.sort-cate-count', '.sort-cate-count__label', '.pc-pcard__price-now'],
};
const SHOT = { home: ['h1.portal-hero__title', '.pc-flashsale__title-text', '.pc-brand__name'], coll: ['.pc-voucher__code', '.pc-pcard__price-now'] };
const mob = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const FRAMES = [
  ['chromium-390', chromium, mob(390, 844)],
  ['webkit-iphone13', webkit, devices['iPhone 13']],
  ['chromium-1440', chromium, { viewport: { width: 1440, height: 900 } }],
  ['chromium-320', chromium, mob(320, 568)],
  ['chromium-768', chromium, { viewport: { width: 768, height: 1024 } }],
  ['chromium-1024', chromium, { viewport: { width: 1024, height: 768 } }],
  ['chromium-844x390', chromium, mob(844, 390)],
];
const before = MODE === 'after' && fs.existsSync(`${OUT}/before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/before.json`, 'utf8')) : null;
const data = {}; const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✗'} ${msg}`); if (!cond) fails.push(msg); };

for (const [name, br, opt] of FRAMES) {
  const b = await br.launch();
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  for (const [pk, path] of PAGES) {
    await p.goto(BASE + path, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
    const r = await p.evaluate((targets) => {
      const cls = (e) => (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
      const bad = {}; let n = 0;
      for (const e of document.querySelectorAll('body *')) {
        if (![...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) continue;
        const c = getComputedStyle(e); const rc = e.getBoundingClientRect();
        if (!rc.width || !rc.height || c.visibility === 'hidden') continue;
        n++;
        // giả tử ::before/::after có chữ (vd dấu ":" đồng hồ) cũng tính
        for (const ps of ['::before', '::after']) { const pc = getComputedStyle(e, ps); if (pc.content && !/^(none|normal|""|'')$/.test(pc.content) && /["'][^"']+["']/.test(pc.content) && pc.display !== 'none') { const w = +pc.fontWeight; if (w < 400 || w > 700) { const k = `${e.tagName.toLowerCase()}${cls(e)}${ps} [${w}]`; bad[k] = (bad[k] || 0) + 1; } } }
        const w = +c.fontWeight; if (w >= 400 && w <= 700) continue;
        const k = `${e.tagName.toLowerCase()}${cls(e)} [${w}]`; bad[k] = (bad[k] || 0) + 1;
      }
      const t = {};
      for (const s of targets) {
        const e = [...document.querySelectorAll(s)].find((x) => { const q = x.getBoundingClientRect(); return q.width && q.height && getComputedStyle(x).visibility !== 'hidden'; });
        if (!e) { t[s] = null; continue; }
        const c = getComputedStyle(e);
        // bề rộng chữ thật bằng Range (không phụ thuộc padding / khung)
        const rg = document.createRange(); rg.selectNodeContents(e);
        t[s] = { w: +rg.getBoundingClientRect().width.toFixed(2), fw: c.fontWeight, fs: c.fontSize, ff: c.fontFamily.split(',')[0].replace(/"/g, ''), txt: e.textContent.trim().slice(0, 24) };
      }
      return { bad, n, t };
    }, TARGETS[pk] || []);
    const nbad = Object.values(r.bad).reduce((a, x) => a + x, 0);
    ok(nbad === 0, `${name} ${pk}: ${nbad} phần tử chữ ngoài 400–700 / ${r.n} phần tử chữ nhìn thấy ${nbad ? JSON.stringify(r.bad) : ''}`);
    data[`${name} ${pk}`] = r.t;
    for (const [s, v] of Object.entries(r.t)) {
      if (!v) { console.log(`  ${name} ${pk} ${s}: không nhìn thấy ở khung này`); continue; }
      const bv = before?.[`${name} ${pk}`]?.[s];
      const same = bv && bv.txt === v.txt ? Math.abs(bv.w - v.w) <= 0.5 : null;
      const msg = `${name} ${pk} ${s}: ${v.ff} ${v.fw} ${v.fs} rộng ${v.w}px${bv ? ` (trước ${bv.fw}, ${bv.w}px)` : ''} "${v.txt}"`;
      if (same === null) console.log(`  ${msg}`); else ok(same, msg);
    }
    for (const s of SHOT[pk] || []) {
      const loc = p.locator(s).first();
      if (!(await loc.isVisible().catch(() => false))) continue;
      await loc.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
      await p.screenshot({ path: `${OUT}/${MODE}-${name}-${pk}-${s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}.png` });
    }
  }
  ok(errs.length === 0, `${name}: lỗi JS ${errs.length} ${errs.slice(0, 2).join(' | ')}`);
  await b.close();
}
if (MODE === 'before') fs.writeFileSync(`${OUT}/before.json`, JSON.stringify(data, null, 1));
console.log(fails.length ? `\nCHƯA ĐẠT: ${fails.length} mục` : '\nĐẠT toàn bộ');
process.exit(fails.length ? 1 : 0);
