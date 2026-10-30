// L03b1 (vòng 41, 30/10/2026 — chạy lại: node ui-loop/checks/L03b1.mjs before|after).
// Việc: gỡ Font Awesome ở KHUNG CHUNG (header, topbar, menu danh mục, footer, thanh đáy, breadcrumb, widget liên hệ,
// popup giỏ, trang tìm kiếm + tìm kiếm rỗng) — thay bằng ui_icon size 'em' trong thẻ <i> bọc cũ.
// Tiêu chí: 7 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13):
//   · 0 thẻ <i class="fa-…"> trong vùng khung chung; 0 chuỗi "PC-ERROR ui_icon" trong HTML;
//   · mỗi icon cũ nhìn thấy ở "before" có icon SVG nhìn thấy ở "after" (cùng thứ tự), w/h > 0, |Δ tâm trong phần tử cha| ≤ 4px,
//     phần tử cha đổi cỡ ≤ 4px, cỡ icon trong 60–160 %, 0 icon bị CSS cũ (svg path {fill}) tô đặc;
//   · 0 lỗi JS; mở menu mobile / ô tìm kiếm / widget liên hệ / dropdown tài khoản topbar bằng chuột rồi Escape được.
// Ảnh: ui-loop/evidence/L03b1/<mode>-<trình duyệt>-<khung>-<trang>.png
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b1';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000';
const PAGES = [['home', '/?tpl=index'], ['coll', '/collections/all'], ['pdp', '/products/serum-vitamin-c-15'],
  ['search0', '/search'], ['searchx', '/search?query=zzqqxxkhongco'], ['booking', '/dat-lich-tu-van']];
const ZONES = 'header.header, .pc-topbar-v3, footer.pc-foot, .pc-bottom-nav, .bread-crumb, .main-widget, .pc-search-empty, .serachpc_searchpage, .backtop, #popup-cart-desktop';
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

const measure = (p) => p.evaluate((zones) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0'; };
  const out = []; let fa = 0;
  for (const z of document.querySelectorAll(zones)) {
    for (const i of z.querySelectorAll('i')) {
      const isFa = /(^|\s)fa-/.test(i.className); if (isFa) fa++;
      const svg = i.querySelector(':scope > svg');
      if (!isFa && !svg) continue;
      const t = svg || i; const r = t.getBoundingClientRect(); const pr = i.parentElement.getBoundingClientRect();
      // quy tắc CSS cũ kiểu  tô đặc icon nét (Lucide) ⇒ đếm hình con có fill khác none
      const filled = svg ? [...svg.querySelectorAll('path,circle,rect,line,polyline,polygon')].filter((e) => getComputedStyle(e).fill !== 'none').length : 0;
      const zc = (z.className && typeof z.className === 'string' ? z.className.split(' ')[0] : z.tagName.toLowerCase());
      out.push({ zone: zc, cls: (i.className || '').replace(/fa-(solid|regular|brands)\s*/g, '').trim(), vis: vis(t) && vis(i),
        x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2 + scrollY), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        rx: +(r.x + r.width / 2 - pr.x).toFixed(1), ry: +(r.y + r.height / 2 - pr.y).toFixed(1), pw: +pr.width.toFixed(1), ph: +pr.height.toFixed(1),
        filled, color: getComputedStyle(t).color });
    }
  }
  return { icons: out, fa, docH: document.documentElement.scrollHeight, pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length };
}, ZONES);

for (const [brn, fr, br, opt] of FRAMES) {
  const key = `${brn}-${fr}`;
  const b = await br.launch();
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  for (const [pk, path] of PAGES) {
    await p.goto(BASE + path, { waitUntil: 'load' });
    await p.evaluate(() => document.getElementById('dev-toolbar')?.remove()); // thanh công cụ preview (dev-server), không thuộc theme
    await p.waitForTimeout(700);
    const m = await measure(p);
    data[`${key}|${pk}`] = m;
    const visN = m.icons.filter((x) => x.vis).length;
    if (MODE === 'after') {
      ok(m.fa === 0, `${key} ${pk}: <i fa-> trong khung chung = ${m.fa}`);
      ok(m.pcErr === 0, `${key} ${pk}: PC-ERROR ui_icon = ${m.pcErr}`);
      const bm = before?.[`${key}|${pk}`];
      if (bm) {
        const bv = bm.icons.filter((x) => x.vis), av = m.icons.filter((x) => x.vis);
        ok(av.length >= bv.length, `${key} ${pk}: icon nhìn thấy before ${bv.length} → after ${av.length}`);
        // so vị trí icon TRONG phần tử cha (không cộng dồn dịch chuyển của cả trang) + cỡ phần tử cha + độ cao trang
        let worst = 0, worstK = '', minR = 9, maxR = 0, parD = 0, parK = '';
        bv.forEach((x, i) => { const y = av[i]; if (!y) return;
          const d = Math.hypot(x.rx - y.rx, x.ry - y.ry); if (d > worst) { worst = d; worstK = x.zone + ' ' + x.cls; }
          const pd = Math.max(Math.abs(x.pw - y.pw), Math.abs(x.ph - y.ph)); if (pd > parD) { parD = pd; parK = x.zone + ' ' + x.cls; }
          const rr = (y.h || 0.01) / (x.h || 0.01); minR = Math.min(minR, rr); maxR = Math.max(maxR, rr); });
        const fill = av.filter((y) => y.filled).map((y) => y.zone + ' ' + y.cls);
        console.log(`   ${key} ${pk}: lệch tâm trong phần tử cha lớn nhất ${worst.toFixed(1)}px (${worstK}) · đổi cỡ phần tử cha lớn nhất ${parD.toFixed(1)}px (${parK}) · tỉ lệ cao icon ${minR.toFixed(2)}–${maxR.toFixed(2)} · cao trang ${bm.docH} → ${m.docH}`);
        ok(worst <= 4 || bv.length === 0, `${key} ${pk}: lệch tâm icon trong phần tử cha ≤ 4px (đo ${worst.toFixed(1)})`);
        ok(parD <= 4 || bv.length === 0, `${key} ${pk}: cỡ phần tử chứa icon đổi ≤ 4px (đo ${parD.toFixed(1)})`);
        ok(bv.length === 0 || (minR >= 0.6 && maxR <= 1.6), `${key} ${pk}: cỡ icon 60–160 % before`);
        ok(fill.length === 0, `${key} ${pk}: icon bị CSS cũ tô đặc = ${fill.length}${fill.length ? ' — ' + fill.slice(0, 3).join(', ') : ''}`);
      }
    } else console.log(`${key} ${pk}: icon FA ${m.fa} · nhìn thấy ${visN}`);
    await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${pk}.png` });
    if (pk === 'home') {
      const foot = p.locator('footer.pc-foot');
      await foot.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
      await foot.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-footer.png` });
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
      // thao tác thật: ô tìm kiếm (mobile) / menu mobile / widget liên hệ / dropdown tài khoản (desktop)
      const w = opt.viewport?.width || 390;
      if (w < 1024) {
        const sb = p.locator('#mb-search-open');
        if (await sb.isVisible()) { await sb.click(); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-search-open.png` });
          await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
        const mb = p.locator('#btn-menu-mobile');
        if (await mb.isVisible()) { await mb.click(); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-menu-open.png` });
          const mm = await measure(p); ok(MODE !== 'after' || mm.fa === 0, `${key} menu mobile mở: <i fa-> = ${mm.fa}`);
          const mmf = mm.icons.filter((x) => x.vis && x.filled).length; ok(MODE !== 'after' || mmf === 0, `${key} menu mobile mở: icon bị tô đặc = ${mmf}`);
          await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.goto(BASE + path, { waitUntil: 'load' }); await p.evaluate(() => document.getElementById('dev-toolbar')?.remove()); await p.waitForTimeout(500); }
      } else {
        const acc = p.locator('.pc-topbar-v3 .topbar-account-btn');
        if (await acc.isVisible()) { await acc.click(); await p.waitForTimeout(300); await p.locator('.pc-topbar-v3').screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-topbar-acc.png` });
          const exp = await acc.getAttribute('aria-expanded'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
          console.log(`   ${key} dropdown tài khoản: aria-expanded khi mở = ${exp}, sau Escape = ${await acc.getAttribute('aria-expanded')}`); }
        const cate = p.locator('.sudes-cate-header .title.js-menu-toggle').first();
        if (await cate.isVisible()) { await cate.hover(); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-cate-hover.png` }); }
      }
      const wb = p.locator('#toggle-widget-btn');
      if (await wb.isVisible()) { await wb.click(); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-widget-open.png` });
        const mw = await measure(p); ok(MODE !== 'after' || mw.fa === 0, `${key} widget liên hệ mở: <i fa-> = ${mw.fa}`);
        const mwf = mw.icons.filter((x) => x.vis && x.filled).length; ok(MODE !== 'after' || mwf === 0, `${key} widget liên hệ mở: icon bị tô đặc = ${mwf}`);
        const opened = await p.evaluate(() => document.querySelector('.main-widget')?.classList.contains('widget-opened'));
        console.log(`   ${key} widget liên hệ mở = ${opened}`); }
      // Tab 6 lần trong header: phần tử focus nhìn thấy
      await p.goto(BASE + path, { waitUntil: 'load' }); await p.evaluate(() => document.getElementById('dev-toolbar')?.remove()); await p.waitForTimeout(400);
      const foc = [];
      for (let k = 0; k < 6; k++) { await p.keyboard.press('Tab'); foc.push(await p.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return `${a.tagName.toLowerCase()}${r.width > 0 ? '' : '(ẩn)'}`; })); }
      await p.keyboard.press('Shift+Tab');
      console.log(`   ${key} Tab: ${foc.join(' → ')}`);
    }
  }
  ok(MODE !== 'after' || errs.length === 0, `${key}: lỗi JS = ${errs.length}${errs.length ? ' — ' + errs[0] : ''}`);
  await b.close();
}
if (MODE === 'before') fs.writeFileSync(`${OUT}/before.json`, JSON.stringify(data, null, 1));
else fs.writeFileSync(`${OUT}/after.json`, JSON.stringify(data, null, 1));
console.log(MODE === 'after' ? (fails.length ? `KẾT QUẢ: CHƯA ĐẠT (${fails.length})` : 'KẾT QUẢ: ĐẠT') : 'Đã ghi before.json');
process.exit(MODE === 'after' && fails.length ? 1 : 0);
