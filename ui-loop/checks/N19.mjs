// N19 (vòng 38, 30/10/2026 — chạy lại: node ui-loop/checks/N19.mjs). Phương án 2: Montserrat tĩnh tự host 400/500/600/700.
// Đo theo tiêu chí chốt vòng 38 trong BACKLOG: (1) request font, (2) document.fonts, (3) mực 600/400 + 700/400,
// (4) chữ tiếng Việt vẽ bằng Montserrat, (5) computed menu / thanh đáy + ảnh drawer, (6) font-display + preload, lỗi JS.
// (Bản vòng 36 — so variable ↔ tĩnh Google — nằm trong git history + ui-loop/evidence/N19/probe-static.mjs.)
import { chromium, webkit, devices } from 'playwright';
const OUT = 'ui-loop/evidence/N19';
const BASE = 'http://localhost:3000';
const PAGES = [['home', '/?tpl=index'], ['pdp', '/products/serum-vitamin-c-15']];
const W = [300, 400, 500, 600, 700, 800];
const mob = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const FRAMES = [
  ['chromium-390', chromium, mob(390, 844), true],
  ['webkit-iphone13', webkit, devices['iPhone 13'], true],
  ['chromium-320', chromium, mob(320, 568), false],
  ['chromium-768', chromium, { viewport: { width: 768, height: 1024 } }, false],
  ['chromium-1024', chromium, { viewport: { width: 1024, height: 768 } }, false],
  ['chromium-1440', chromium, { viewport: { width: 1440, height: 900 } }, false],
  ['chromium-844x390', chromium, mob(844, 390), false],
];
const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✗'} ${msg}`); if (!cond) fails.push(msg); };
const ratios = {};

for (const [name, br, opt, deep] of FRAMES) {
  const b = await br.launch();
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const reqs = []; const errs = [];
  p.on('response', (r) => { const u = r.url(); if (/fonts\.(googleapis|gstatic)\.com|montserrat-/i.test(u)) reqs.push([u, r.status()]); });
  p.on('requestfailed', (r) => { const u = r.url(); if (/fonts\.(googleapis|gstatic)\.com|montserrat-/i.test(u)) reqs.push([u, 'FAILED']); });
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  for (const [pk, path] of PAGES) {
    reqs.length = 0;
    await p.goto(BASE + path, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
    // (1) request
    const ext = reqs.filter(([u]) => /fonts\.(googleapis|gstatic)\.com/.test(u));
    const loc = reqs.filter(([u]) => /\/assets\/montserrat-/.test(u));
    const byPath = {}; for (const [u] of loc) { const k = new URL(u).pathname; byPath[k] = (byPath[k] || 0) + 1; }
    ok(ext.length === 0, `${name} ${pk}: request Google Fonts = ${ext.length}`);
    ok(loc.length > 0 && loc.every(([, s]) => s === 200), `${name} ${pk}: file montserrat tải ${loc.length} lượt, trạng thái ${[...new Set(loc.map(([, s]) => s))].join('/')} — ${Object.keys(byPath).map((k) => k.split('/').pop()).join(', ')}`);
    ok(Object.values(byPath).every((n) => n === 1), `${name} ${pk}: mỗi file font tải đúng 1 lần (preload trùng URL CSS) — ${JSON.stringify(Object.values(byPath))}`);
    // (2) document.fonts + (6) font-display + preload
    const info = await p.evaluate(() => {
      const faces = [...document.fonts].filter((f) => /montserrat/i.test(f.family)).map((f) => [f.weight, f.status, f.display]);
      const pre = [...document.querySelectorAll('link[rel=preload][as=font]')].map((l) => l.href);
      return { faces, pre };
    });
    const loaded = [...new Set(info.faces.filter(([, s]) => s === 'loaded').map(([w]) => w))].sort();
    const weights = [...new Set(info.faces.map(([w]) => w))].sort();
    ok(['400', '500', '600', '700'].every((w) => weights.includes(w)) && !weights.includes('300') && !weights.includes('800'), `${name} ${pk}: mặt Montserrat khai báo ${weights.join('/')} (${info.faces.length} @font-face), loaded ${loaded.join('/')}`);
    ok(info.faces.every(([, , d]) => d === 'swap'), `${name} ${pk}: font-display = ${[...new Set(info.faces.map(([, , d]) => d))].join('/')}`);
    ok(info.pre.length === 1 && /\/assets\/montserrat-400-latin\.woff2$/.test(info.pre[0]), `${name} ${pk}: preload font = ${info.pre.map((u) => u.split('/').pop()).join(', ')}`);
    // (5) computed menu / thanh đáy
    const comp = await p.evaluate(() => ['#nav > li > a', '.pc-bottom-nav a', 'h1', 'body'].map((s) => { const e = document.querySelector(s); if (!e) return [s, null]; const c = getComputedStyle(e); return [s, c.fontFamily.split(',')[0].replace(/"/g, ''), c.fontWeight, c.fontSize]; }));
    console.log(`  ${name} ${pk} computed: ${JSON.stringify(comp)}`);
    if (pk === 'home') {
      await p.screenshot({ path: `${OUT}/after-${name}.png` });
      if (deep) {
        const burger = p.locator('.menu-icon[aria-label="Menu"]').first();
        if (await burger.count() && await burger.isVisible()) {
          await burger.click(); await p.waitForTimeout(900);
          await p.screenshot({ path: `${OUT}/after-${name}-drawer.png` });
          await p.keyboard.press('Escape'); await p.waitForTimeout(400);
        }
      } else {
        await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');
        await p.mouse.wheel(0, 1200); await p.waitForTimeout(300);
      }
      // (3)(4) mực + chữ tiếng Việt
      const rows = await p.evaluate((W) => {
        const box = document.createElement('div'); box.id = 'n19probe';
        box.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:2147483647;padding:8px';
        const mk = (id, fam, w, txt) => { const d = document.createElement('div'); d.id = id; d.textContent = txt; d.style.cssText = `font-family:${fam};font-size:15px;line-height:24px;color:#0f172a;font-weight:${w};width:max-content;padding:0 2px`; box.appendChild(d); return d; };
        for (const w of W) mk(`m-${w}`, 'Montserrat', w, `Chăm sóc da mặt (${w})`);
        const vn = 'Ưu đãi đặc biệt — Chăm sóc da';
        const a = mk('vn-m', 'Montserrat', 600, vn); const c = mk('vn-s', 'sans-serif', 600, vn);
        document.body.appendChild(box);
        return { vnM: a.getBoundingClientRect().width, vnS: c.getBoundingClientRect().width, check: document.fonts.check('600 15px Montserrat', vn) };
      }, W);
      await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
      await p.locator('#n19probe').screenshot({ path: `${OUT}/after-${name}-ink.png` });
      const ink = {};
      for (const w of W) {
        const buf = await p.locator(`#m-${w}`).screenshot();
        ink[w] = await p.evaluate(async (b64) => {
          const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d');
          g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0;
          for (let i = 0; i < d.length; i += 4) s += 255 - (d[i] + d[i + 1] + d[i + 2]) / 3;
          return Math.round(s / 255);
        }, buf.toString('base64'));
      }
      const r6 = ink[600] / ink[400]; const r7 = ink[700] / ink[400];
      ratios[name] = [r6, r7];
      console.log(`  ${name} mực 300/400/500/600/700/800 = ${W.map((w) => ink[w]).join(' / ')}`);
      ok(r6 >= 1.4, `${name}: mực 600/400 = ${r6.toFixed(2)} (≥ 1,4)`);
      ok(r7 >= 1.6, `${name}: mực 700/400 = ${r7.toFixed(2)} (≥ 1,6)`);
      ok(rows.check && Math.abs(rows.vnM - rows.vnS) > 2, `${name}: tiếng Việt Montserrat ${rows.vnM.toFixed(1)}px ≠ sans-serif ${rows.vnS.toFixed(1)}px, fonts.check=${rows.check}`);
    }
  }
  ok(errs.length === 0, `${name}: lỗi JS = ${errs.length}${errs.length ? ' — ' + errs[0] : ''}`);
  await b.close();
}
const [c6, c7] = ratios['chromium-390']; const [w6, w7] = ratios['webkit-iphone13'];
ok(Math.abs(w6 / c6 - 1) <= 0.15 && Math.abs(w7 / c7 - 1) <= 0.15, `WebKit ↔ Chromium 390: 600/400 ${w6.toFixed(2)} ↔ ${c6.toFixed(2)} (lệch ${(Math.abs(w6 / c6 - 1) * 100).toFixed(1)}%), 700/400 ${w7.toFixed(2)} ↔ ${c7.toFixed(2)} (lệch ${(Math.abs(w7 / c7 - 1) * 100).toFixed(1)}%)`);
console.log(fails.length ? `KẾT QUẢ: CHƯA ĐẠT (${fails.length})` : 'KẾT QUẢ: ĐẠT');
process.exitCode = fails.length ? 1 : 0;
