// L03b42 (vòng 113): định vị điểm ảnh khác giữa before/after ảnh khối ô lọc + đo lại cao trang /dang-ky-lieu-trinh-tri-mun.
// Chạy: node ui-loop/checks/L03b42-diff.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'ui-loop/evidence/L03b42';
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
for (const fr of ['320', '1024', '390', '1440']) {
  const fa = `${OUT}/before-chromium-${fr}-filtertag.png`, fb = `${OUT}/after-chromium-${fr}-filtertag.png`;
  const u = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const r = await p.evaluate(async ([a, c]) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(a), load(c)]);
    const px = (i) => { const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const x = cv.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
    const da = px(ia), db = px(ib); const pts = []; let maxD = 0;
    for (let k = 0; k < da.length; k += 4) {
      const d = Math.max(Math.abs(da[k] - db[k]), Math.abs(da[k + 1] - db[k + 1]), Math.abs(da[k + 2] - db[k + 2]));
      if (d) { const n = k / 4; pts.push([n % ia.width, Math.floor(n / ia.width), d]); maxD = Math.max(maxD, d); }
    }
    return { n: pts.length, maxD, pts: pts.slice(0, 20) };
  }, [u(fa), u(fb)]);
  console.log(`khung ${fr}: ${r.n} điểm khác, ΔRGB lớn nhất ${r.maxD}, toạ độ [x,y,Δ] ${JSON.stringify(r.pts)}`);
}
await b.close();
// Cao trang /dang-ky-lieu-trinh-tri-mun 390 — 3 lượt
const b2 = await chromium.launch();
for (let i = 0; i < 3; i++) {
  const ctx = await b2.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:3000/dang-ky-lieu-trinh-tri-mun', { waitUntil: 'load', timeout: 60000 });
  await pg.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await pg.waitForTimeout(900);
  const h1 = await pg.evaluate(() => document.documentElement.scrollHeight);
  await pg.waitForTimeout(3000);
  const h2 = await pg.evaluate(() => document.documentElement.scrollHeight);
  console.log(`/dang-ky-lieu-trinh-tri-mun 390 lượt ${i + 1}: cao sau 0,9s ${h1} · sau 3,9s ${h2}`);
  await ctx.close();
}
await b2.close();
