// N26 — viền focus nút header «Danh mục» (.js-menu-toggle) và «Tìm kiếm» (.header-action-search) ở /collections/all:
// Tab tới nút, đo outline + tương phản viền / nền liền kề, Enter mở, Escape đóng & trả focus (Danh mục), Shift+Tab lùi.
// Khung nào nút bị ẩn (mobile) thì ghi "không hiển thị". Chạy: node ui-loop/checks/N26.mjs
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3000';
const PAGES = ['/collections/all', '/'];
const OUT = 'ui-loop/evidence/N26'; fs.mkdirSync(OUT, { recursive: true });
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
const TARGETS = ['js-menu-toggle', 'header-action-search'];
let fail = 0;
const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
// màu có alpha (vd viền auto WebKit rgba(…, 0.8)) ⇒ pha trộn lên nền trước khi tính tương phản
const blend = (c, bg) => { const f = c.match(/[\d.]+/g).map(Number), g = bg.match(/[\d.]+/g).map(Number); const al = f.length > 3 ? f[3] : 1; return `rgb(${[0, 1, 2].map((i) => Math.round(f[i] * al + g[i] * (1 - al))).join(', ')})`; };
const ratio = (a, b) => { const x = lum(blend(a, b)), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
for (const [bn, vn, ctxOpt] of VPS) {
  const browser = await (bn === 'webkit' ? webkit : chromium).launch();
  const ctx = await browser.newContext(ctxOpt);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  for (const url of PAGES) {
    await page.goto(BASE + url, { waitUntil: 'load' }); await page.waitForTimeout(800);
    for (const cls of TARGETS) {
      const vis = await page.locator('header.header .' + cls).first().isVisible();
      if (!vis) { console.log(`${bn} ${vn} ${url} .${cls}: không hiển thị ở khung này — bỏ qua`); continue; }
      await page.evaluate(() => { document.activeElement && document.activeElement.blur(); scrollTo(0, 0); });
      let found = false, tabs = 0;
      // WebKit macOS mặc định không Tab tới button ⇒ Alt+Tab (tương đương Option+Tab của Safari)
      const key = bn === 'webkit' ? 'Alt+Tab' : 'Tab';
      for (; tabs < 30; tabs++) { await page.keyboard.press(key); if (await page.evaluate((c) => document.activeElement?.classList.contains(c), cls)) { found = true; break; } }
      if (!found) { console.log(`${bn} ${vn} ${url} .${cls}: KHÔNG Tab tới được sau 30 lần`); fail++; continue; }
      await page.waitForTimeout(250); // chờ hết chuyển màu nền :focus-visible
      const m = await page.evaluate(() => {
        const a = document.activeElement, s = getComputedStyle(a);
        // nền liền kề viền = nền của phần tử cha gần nhất có màu nền (viền nằm ngoài nút)
        let bg = 'rgba(0, 0, 0, 0)', n = a.parentElement; while (n && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { bg = getComputedStyle(n).backgroundColor; n = n.parentElement; }
        if (/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) bg = 'rgb(255, 255, 255)';
        return { st: s.outlineStyle, w: parseFloat(s.outlineWidth), col: s.outlineColor, off: s.outlineOffset, bg, selfBg: s.backgroundColor, fv: a.matches(':focus-visible'), r: a.getBoundingClientRect().toJSON() };
      });
      const cr = ratio(m.col, m.bg), crSelf = /rgba\(0, 0, 0, 0\)/.test(m.selfBg) ? cr : ratio(m.col, m.selfBg);
      const ok = m.st !== 'none' && m.w >= 2 && cr >= 3;
      if (!ok) fail++;
      if (url === PAGES[0]) {
        const x = Math.max(0, m.r.x - 40), y = Math.max(0, m.r.y - 30);
        await page.screenshot({ path: `${OUT}/after-${bn}-${vn}-${cls}.png`, clip: { x, y, width: Math.min(m.r.width + 80, (ctxOpt.viewport?.width || 390) - x), height: m.r.height + 60 } });
      }
      let extra = '';
      if (cls === 'js-menu-toggle') {
        await page.keyboard.press('Enter'); await page.waitForTimeout(350);
        const opened = await page.evaluate(() => ({ exp: document.querySelector('header .js-menu-toggle').getAttribute('aria-expanded'), links: [...document.querySelectorAll('#header-category-menu a')].filter((a) => a.getBoundingClientRect().height > 0).length }));
        await page.keyboard.press('Escape'); await page.waitForTimeout(250);
        const after = await page.evaluate(() => ({ exp: document.querySelector('header .js-menu-toggle').getAttribute('aria-expanded'), back: document.activeElement?.classList.contains('js-menu-toggle') }));
        if (opened.exp !== 'true' || after.exp !== 'false' || !after.back) fail++;
        extra = ` | Enter→expanded=${opened.exp} (${opened.links} link hiện), Escape→expanded=${after.exp}, focus về nút=${after.back}`;
      } else {
        await page.keyboard.press('Enter'); await page.waitForTimeout(350);
        const st = await page.evaluate(() => { const a = document.activeElement; return a ? a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + '.' + String(a.className).split(' ')[0] : null; });
        await page.keyboard.press('Escape'); await page.waitForTimeout(250);
        extra = ` | Enter→focus ${st}`;
        await page.goto(BASE + url, { waitUntil: 'load' }); await page.waitForTimeout(500);
        await page.evaluate(() => document.querySelector('header .header-action-search').focus());
      }
      await page.keyboard.press(bn === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
      const prev = await page.evaluate(() => { const a = document.activeElement; return a ? a.tagName.toLowerCase() + '.' + String(a.className).split(' ')[0] + '«' + (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 14) + '»' : null; });
      console.log(`${ok ? 'ĐẠT' : 'CHƯA'} ${bn} ${vn} ${url} .${cls}: Tab×${tabs + 1} outline ${m.st} ${m.w}px ${m.col} offset ${m.off} | nền liền kề ${m.bg} → ${cr.toFixed(2)}:1 | nền nút ${m.selfBg} → ${crSelf.toFixed(2)}:1 | :focus-visible ${m.fv}${extra} | Shift+Tab→${prev}`);
    }
  }
  if (errs.length) { console.log(`${bn} ${vn}: lỗi JS`, errs.slice(0, 3)); fail++; }
  await browser.close();
}
console.log(fail ? `KẾT QUẢ: CHƯA ĐẠT (${fail})` : 'KẾT QUẢ: ĐẠT');
process.exit(fail ? 1 : 0);
