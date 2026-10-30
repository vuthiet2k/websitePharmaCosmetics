// N24 — viền focus 2 nút topbar (Chọn ngôn ngữ, Tài khoản): Tab tới nút, đo outline + tương phản viền/nền topbar,
// Enter mở danh sách, Escape đóng & trả focus, Shift+Tab lùi. Chạy: node ui-loop/checks/N24.mjs
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3000';
const PAGES = ['/dat-lich-tu-van', '/'];
const OUT = 'ui-loop/evidence/N24'; fs.mkdirSync(OUT, { recursive: true });
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
const TARGETS = [['lang-btn', '#langList'], ['topbar-account-btn', '#topbarAccountList']];
let fail = 0;
const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
for (const [bn, vn, ctxOpt] of VPS) {
  const browser = await (bn === 'webkit' ? webkit : chromium).launch();
  const ctx = await browser.newContext(ctxOpt);
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  for (const url of PAGES) {
    await page.goto(BASE + url, { waitUntil: 'load' }); await page.waitForTimeout(800);
    for (const [cls, list] of TARGETS) {
      const vis = await page.locator('.pc-topbar-v3 .' + cls).first().isVisible();
      if (!vis) { console.log(`${bn} ${vn} ${url} .${cls}: không hiển thị ở khung này — bỏ qua`); continue; }
      await page.evaluate(() => { document.activeElement && document.activeElement.blur(); scrollTo(0, 0); });
      let found = false, tabs = 0;
      // WebKit macOS mặc định không Tab tới button ⇒ dùng Alt+Tab (tương đương Option+Tab của Safari)
      const key = bn === 'webkit' ? 'Alt+Tab' : 'Tab';
      for (; tabs < 20; tabs++) { await page.keyboard.press(key); if (await page.evaluate((c) => document.activeElement?.classList.contains(c), cls)) { found = true; break; } }
      if (!found) { console.log(`${bn} ${vn} ${url} .${cls}: KHÔNG Tab tới được sau 20 lần`); fail++; continue; }
      const m = await page.evaluate((c) => {
        const a = document.activeElement, s = getComputedStyle(a), bar = a.closest('.pc-topbar-v3');
        let bg = 'rgba(0, 0, 0, 0)', n = a; while (n && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { bg = getComputedStyle(n).backgroundColor; n = n.parentElement; }
        return { st: s.outlineStyle, w: parseFloat(s.outlineWidth), col: s.outlineColor, off: s.outlineOffset, bg, fv: a.matches(':focus-visible'), r: a.getBoundingClientRect().toJSON(), barH: bar.getBoundingClientRect().height };
      }, cls);
      const cr = ratio(m.col, m.bg);
      const ok = m.st !== 'none' && m.w >= 2 && cr >= 3;
      if (!ok) fail++;
      if (url === PAGES[0]) await page.screenshot({ path: `${OUT}/after-${bn}-${vn}-${cls}.png`, clip: { x: 0, y: 0, width: ctxOpt.viewport?.width || 390, height: Math.min(140, m.barH + 60) } });
      // Enter mở, Escape đóng và trả focus
      await page.keyboard.press('Enter'); await page.waitForTimeout(200);
      const opened = await page.evaluate((c) => document.querySelector('.' + c).getAttribute('aria-expanded'), cls);
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      const after = await page.evaluate((c) => ({ exp: document.querySelector('.pc-topbar-v3 .' + c).getAttribute('aria-expanded'), back: document.activeElement?.classList.contains(c) }), cls);
      await page.keyboard.press(bn === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
      const prev = await page.evaluate(() => { const a = document.activeElement; return a ? a.tagName.toLowerCase() + '.' + String(a.className).split(' ')[0] : null; });
      console.log(`${ok ? 'ĐẠT' : 'CHƯA'} ${bn} ${vn} ${url} .${cls}: Tab×${tabs + 1} outline ${m.st} ${m.w}px ${m.col} offset ${m.off} | nền ${m.bg} | tương phản ${cr.toFixed(2)}:1 | :focus-visible ${m.fv} | Enter→expanded=${opened}, Escape→expanded=${after.exp}, focus về nút=${after.back} | Shift+Tab→${prev}`);
    }
  }
  if (errs.length) { console.log(`${bn} ${vn}: lỗi JS`, errs.slice(0, 3)); fail++; }
  await browser.close();
}
console.log(fail ? `KẾT QUẢ: CHƯA ĐẠT (${fail})` : 'KẾT QUẢ: ĐẠT');
process.exit(fail ? 1 : 0);
