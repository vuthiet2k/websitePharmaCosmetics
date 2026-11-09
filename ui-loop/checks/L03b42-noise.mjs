// L03b42 (vòng 113): ảnh khối ô lọc 320/1024 — chụp 2 lượt ở cùng mã (after) để biết nhiễu lượt-với-lượt; đo vị trí hộp
// ::before bằng điểm ảnh viền (không lấy được rect pseudo). Chạy: node ui-loop/checks/L03b42-noise.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'ui-loop/evidence/L03b42';
const mob = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const FR = [['320', mob(320, 568)], ['1024', { viewport: { width: 1024, height: 768 } }]];
const b = await chromium.launch();
async function shot(opt, file) {
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/collections/all', { waitUntil: 'load', timeout: 60000 });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForTimeout(900);
  const openBtn = p.locator('.btn-filter-mobile:visible').first();
  if (await openBtn.count()) { await openBtn.click(); await p.waitForTimeout(600); }
  const pos = await p.evaluate(() => {
    const host = document.querySelector('.filter-container > .aside-filter-groups');
    const wrap = document.createElement('div');
    wrap.innerHTML = `<aside class="aside-item filter-tag-style-1 tag-filtster" id="l03b42-tag"><div class="aside-title"><h2 class="title-head margin-top-0"><span>Loại da</span></h2></div><div class="aside-content filter-group"><ul><li class="filter-item filter-item--check-box filter-item--green"><span><label for="filter-da-dau"><input type="checkbox" id="filter-da-dau" data-group="tag21" data-field="tags" data-text="Da dầu" value="(Da dầu)" data-operator="OR"><i class="fa"></i>Da dầu</label></span></li></ul></div></aside>`;
    const node = wrap.firstChild; host.after(node); node.scrollIntoView({ block: 'center' });
    const r = node.getBoundingClientRect(); const l = node.querySelector('label').getBoundingClientRect();
    return { aside: [r.x, r.y, r.width, r.height], label: [l.x, l.y], scrollY: scrollY };
  });
  await p.waitForTimeout(200);
  await p.locator('#l03b42-tag label').click({ force: true });
  await p.waitForTimeout(250);
  await p.locator('#l03b42-tag').screenshot({ path: file });
  await ctx.close();
  return pos;
}
const diff = async (fa, fb) => {
  const ctx = await b.newContext(); const p = await ctx.newPage();
  const u = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const r = await p.evaluate(async ([a, c]) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(a), load(c)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { sameSize: false };
    const px = (i) => { const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const x = cv.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
    const da = px(ia), db = px(ib); let n = 0, m = 0;
    for (let k = 0; k < da.length; k += 4) { const d = Math.max(Math.abs(da[k] - db[k]), Math.abs(da[k + 1] - db[k + 1]), Math.abs(da[k + 2] - db[k + 2])); if (d) { n++; m = Math.max(m, d); } }
    // Hộp ô chọn: hàng/cột có điểm ảnh sẫm (viền/nền xanh) trong vùng nhãn
    const box = (d, w, h) => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 50; y < h; y++) for (let x = 0; x < Math.min(w, 60); x++) { const k = (y * w + x) * 4; if (d[k] < 120 && d[k + 1] > 60 && d[k + 2] < 120 && d[k + 1] - d[k] > 30) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } } return [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; };
    return { sameSize: true, diffPx: n, maxD: m, boxA: box(da, ia.width, ia.height), boxB: box(db, ib.width, ib.height) };
  }, [u(fa), u(fb)]);
  await ctx.close(); return r;
};
for (const [fr, opt] of FR) {
  const f1 = `${OUT}/noise-${fr}-1.png`, f2 = `${OUT}/noise-${fr}-2.png`;
  const p1 = await shot(opt, f1), p2 = await shot(opt, f2);
  console.log(`khung ${fr}: vị trí lượt 1 ${JSON.stringify(p1)} · lượt 2 ${JSON.stringify(p2)}`);
  console.log(`  lượt 1 vs lượt 2 (cùng mã after): ${JSON.stringify(await diff(f1, f2))}`);
  console.log(`  before vs lượt 1: ${JSON.stringify(await diff(`${OUT}/before-chromium-${fr}-filtertag.png`, f1))}`);
  console.log(`  before vs after (lượt kiểm chính): ${JSON.stringify(await diff(`${OUT}/before-chromium-${fr}-filtertag.png`, `${OUT}/after-chromium-${fr}-filtertag.png`))}`);
}
await b.close();
