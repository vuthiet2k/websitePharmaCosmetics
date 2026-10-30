// N19 (vòng 36, chạy lại: node ui-loop/checks/N19.mjs). Google Fonts trả 1 file variable (trục wght) cho mọi độ đậm.
// Kiểm WebKit (Playwright Windows) có vẽ được trục wght không: so "lượng mực" giữa (v) Montserrat site đang nạp (variable),
// (s) file tĩnh từng độ đậm (css2?family=Montserrat:wght@<w> — một độ đậm) gắn tên tạm MTest<w>, (a) Arial 400/700 đối chứng.
// Thêm: chụp drawer ☰ + thanh đáy thật ở 2 trình duyệt.
import { chromium, webkit, devices } from 'playwright';
const OUT = 'ui-loop/evidence/N19';
const W = [300, 400, 600, 800];
for (const [name, br, opt] of [['chromium-390', chromium, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['webkit-iphone13', webkit, devices['iPhone 13']]]) {
  const b = await br.launch(); const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' }); const p = await ctx.newPage();
  const ua = await p.evaluate(() => navigator.userAgent);
  const srcs = {};
  for (const w of W) {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Montserrat:wght@${w}&display=swap`, { headers: { 'User-Agent': ua } })).text();
    const blocks = css.split('@font-face').filter((x) => x.includes('url(')); // khối cuối = latin
    srcs[w] = blocks[blocks.length - 1].match(/url\(([^)]+)\)/)[1];
  }
  const varCss = await (await fetch('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap', { headers: { 'User-Agent': ua } })).text();
  const varSrc = varCss.split('@font-face').filter((x) => x.includes('url(')).map((x) => x.match(/url\(([^)]+)\)/)[1]);
  console.log(name, 'site request: @font-face', varSrc.length, '· file khác nhau', new Set(varSrc).size);
  await p.goto('http://localhost:3000/?tpl=index', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  // Ảnh drawer ☰ + thanh đáy thật
  const burger = p.locator('.menu-icon[aria-label="Menu"]').first();
  if (await burger.count()) { await burger.click(); await p.waitForTimeout(800); }
  await p.screenshot({ path: `${OUT}/after-${name}-drawer.png` });
  const live = await p.evaluate(() => ['#nav > li > a', '.pc-bottom-nav a'].map((s) => { const e = document.querySelector(s); if (!e) return [s, null]; const c = getComputedStyle(e); return [s, c.fontFamily.split(',')[0], c.fontWeight, c.fontSize]; }));
  console.log(name, 'computed:', JSON.stringify(live));
  await p.keyboard.press('Escape');
  await p.evaluate(async ({ W, srcs }) => {
    for (const w of W) { const f = new FontFace(`MTest${w}`, `url(${srcs[w]})`); await f.load(); document.fonts.add(f); }
    await document.fonts.ready;
    const box = document.createElement('div'); box.id = 'n19probe';
    box.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:2147483647;padding:8px';
    const rows = [...W.map((w) => [`v-${w}`, 'Montserrat', w]), ...W.map((w) => [`s-${w}`, `MTest${w}`, 400]), ['a-400', 'Arial', 400], ['a-700', 'Arial', 700]];
    for (const [id, fam, w] of rows) {
      const d = document.createElement('div'); d.id = id; d.textContent = `Chăm sóc da mặt (${id})`;
      d.style.cssText = `font-family:${fam};font-size:15px;line-height:24px;color:#0f172a;font-weight:${w};width:max-content;padding:0 2px`;
      box.appendChild(d);
    }
    document.body.appendChild(box);
  }, { W, srcs });
  await p.waitForTimeout(300);
  await p.locator('#n19probe').screenshot({ path: `${OUT}/probe-static-${name}.png` });
  const res = {}; const wid = {};
  for (const id of [...W.map((w) => `v-${w}`), ...W.map((w) => `s-${w}`), 'a-400', 'a-700']) {
    const loc = p.locator(`#${id}`);
    wid[id] = (await loc.boundingBox()).width.toFixed(1);
    const buf = await loc.screenshot();
    res[id] = await p.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d');
      g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 255 - (d[i] + d[i + 1] + d[i + 2]) / 3;
      return Math.round(s / 255);
    }, buf.toString('base64'));
  }
  console.log(name, 'ink:', JSON.stringify(res));
  console.log(name, 'width px:', JSON.stringify(wid));
  await b.close();
}
