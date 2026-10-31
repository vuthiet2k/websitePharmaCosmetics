// N25 (vòng 60, 31/10/2026) — ui_icon chế độ sprite cho menu header_nav_cate (chủ dự án duyệt phương án (a) 31/10/2026).
// Chạy: node ui-loop/checks/N25s.mjs before|after   (before chạy TRƯỚC khi sửa — ghi before.json + ảnh cắt từng icon)
// Tiêu chí (BACKLOG N25, ghi trước khi sửa):
//  (a) HTML 10 trang PERF giảm ≥ 100 KB/trang; template header_nav_cate giảm ≥ 100 KB; đúng 1 khối sprite, 0 id trùng;
//  (b) 8 khung: drawer ☰ (mobile, mở nhóm đầu) / rê nút Danh mục (desktop) — icon menu nhìn thấy before = after,
//      cỡ lệch ≤ 1px, tâm trong phần tử cha lệch ≤ 1px, ảnh cắt khác ≤ 2 % điểm ảnh, svg aria-hidden; 0 PC-ERROR; 0 lỗi JS;
//      Escape đóng drawer, focus về nút ☰ như before.
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/N25';
const CROPS = `${OUT}/crops`;
fs.mkdirSync(CROPS, { recursive: true });
const BASE = 'http://localhost:3000';
const PERF = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/soi-da', '/tin-tuc',
  '/blogs/tin-tuc-va-kien-thuc/retinol-thanh-phan-vang-chong-lao-hoa', '/skinhealthy-services', '/dat-lich-tu-van', '/?tpl=login'];
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
const before = MODE === 'after' && fs.existsSync(`${OUT}/sprite-before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/sprite-before.json`, 'utf8')) : null;
const data = { html: {}, frames: {} }; const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✗'} ${msg}`); if (!cond) fails.push(msg); };

// (a) HTML
console.log('== (a) HTML trả về (không nén)');
for (const pth of PERF) {
  const h = await (await fetch(BASE + pth)).text();
  const tpl = (h.match(/<script type="text\/x-custom-template" data-template="header_nav_cate">([\s\S]*?)<\/script>/) || ['', ''])[1];
  const ids = [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((x) => x.startsWith('pc-i-'));
  const dup = ids.length - new Set(ids).size;
  const r = { kb: +(Buffer.byteLength(h) / 1024).toFixed(1), tplKb: +(Buffer.byteLength(tpl) / 1024).toFixed(1),
    svg: (h.match(/<svg[\s>]/g) || []).length, tplSvg: (tpl.match(/<svg[\s>]/g) || []).length,
    symbols: (h.match(/<symbol[\s>]/g) || []).length, spriteBlocks: (h.match(/data-pc-sprite/g) || []).length, dupIds: dup,
    pcErr: (h.match(/PC-ERROR ui_icon/g) || []).length };
  data.html[pth] = r;
  const b = before?.html?.[pth];
  console.log(`  ${pth.slice(0, 40).padEnd(40)} HTML ${b ? b.kb + ' → ' : ''}${r.kb} KB · template ${b ? b.tplKb + ' → ' : ''}${r.tplKb} KB · svg ${b ? b.svg + ' → ' : ''}${r.svg} (template ${r.tplSvg}) · symbol ${r.symbols} · khối sprite ${r.spriteBlocks} · id trùng ${dup} · PC-ERROR ${r.pcErr}`);
  if (MODE === 'after' && b) {
    ok(b.kb - r.kb >= 100, `${pth}: HTML giảm ${(b.kb - r.kb).toFixed(1)} KB (≥ 100)`);
    ok(b.tplKb - r.tplKb >= 100, `${pth}: template header_nav_cate giảm ${(b.tplKb - r.tplKb).toFixed(1)} KB (≥ 100)`);
    ok(r.spriteBlocks === 1 && dup === 0 && r.pcErr === 0, `${pth}: 1 khối sprite (${r.spriteBlocks}), id trùng ${dup}, PC-ERROR ${r.pcErr}`);
  }
}

// (b) trình duyệt
const icons = (p) => p.evaluate(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.opacity !== '0' && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const all = [...document.querySelectorAll('#header-category-menu svg')];
  const out = all.filter(vis).map((s) => { const r = s.getBoundingClientRect(); const pr = s.parentElement.getBoundingClientRect();
    return { x: r.x, y: r.y, w: +r.width.toFixed(2), h: +r.height.toFixed(2), rx: +(r.x + r.width / 2 - pr.x).toFixed(2), ry: +(r.y + r.height / 2 - pr.y).toFixed(2),
      hidden: s.getAttribute('aria-hidden'), color: getComputedStyle(s).color, use: !!s.querySelector('use') }; });
  return { total: all.length, vis: out };
});
const crop = async (p, list, tag) => { const files = [];
  for (let i = 0; i < Math.min(list.length, 14); i++) { const s = list[i]; const f = `${CROPS}/${MODE}-${tag}-${i}.png`;
    await p.screenshot({ path: f, clip: { x: Math.max(0, Math.floor(s.x) - 1), y: Math.max(0, Math.floor(s.y) - 1), width: Math.ceil(s.w) + 2, height: Math.ceil(s.h) + 2 } });
    files.push(f); }
  return files; };

const cmpBrowser = await chromium.launch(); const cmpPage = await cmpBrowser.newPage();
const diff = (a, b) => cmpPage.evaluate(async ([a, b]) => {
  const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; });
  const [x, y] = await Promise.all([load(a), load(b)]);
  if (x.width !== y.width || x.height !== y.height) return { ratio: 1, size: `${x.width}x${x.height}≠${y.width}x${y.height}` };
  const c = document.createElement('canvas'); c.width = x.width; c.height = x.height; const g = c.getContext('2d');
  g.drawImage(x, 0, 0); const dx = g.getImageData(0, 0, c.width, c.height).data; g.clearRect(0, 0, c.width, c.height);
  g.drawImage(y, 0, 0); const dy = g.getImageData(0, 0, c.width, c.height).data; let n = 0;
  for (let i = 0; i < dx.length; i += 4) if (Math.max(Math.abs(dx[i] - dy[i]), Math.abs(dx[i + 1] - dy[i + 1]), Math.abs(dx[i + 2] - dy[i + 2])) > 40) n++;
  return { ratio: n / (dx.length / 4) };
}, [a, b]);
const durl = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

for (const [brn, fr, br, opt] of FRAMES) {
  const key = `${brn}-${fr}`; const w = opt.viewport?.width || 390;
  const b = await br.launch(); const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.goto(BASE + '/?tpl=index', { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove()); await p.waitForTimeout(800);
  const st = { };
  if (w < 1024) {
    const mb = p.locator('#btn-menu-mobile');
    if (await mb.isVisible()) {
      await mb.click(); await p.waitForTimeout(700);
      st.closed = await icons(p); st.closedCrops = await crop(p, st.closed.vis, `${key}-drawer`);
      await p.screenshot({ path: `${OUT}/${MODE}-sprite-${brn}-${fr}-drawer.png` });
      const op = p.locator('#header-category-menu .sudes-main-cate > li > .open_mnu').first();
      if (await op.isVisible()) { await op.click(); await p.waitForTimeout(700); }
      st.open = await icons(p); st.openCrops = await crop(p, st.open.vis, `${key}-group`);
      await p.screenshot({ path: `${OUT}/${MODE}-sprite-${brn}-${fr}-group.png` });
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      st.esc = await p.evaluate(() => ({ open: document.querySelector('.header-menu')?.classList.contains('current'), focus: document.activeElement?.id || document.activeElement?.tagName }));
    } else st.note = 'không có nút ☰';
  } else {
    const cate = p.locator('.sudes-cate-header .title.js-menu-toggle').first();
    if (await cate.isVisible()) {
      await cate.click(); await p.waitForTimeout(900);
      st.open = await icons(p); st.openCrops = await crop(p, st.open.vis, `${key}-mega`);
      await p.screenshot({ path: `${OUT}/${MODE}-sprite-${brn}-${fr}-mega.png` });
      // rê sang nhóm thứ 2 (có danh mục con) để kiểm thêm 1 lượt icon
      const li2 = p.locator('#header-category-menu .sudes-main-cate > li.sudes-main-cate-has-child').nth(1);
      if (await li2.isVisible()) { await li2.hover(); await p.waitForTimeout(600); st.open2 = await icons(p); st.open2Crops = await crop(p, st.open2.vis, `${key}-mega2`);
        await p.screenshot({ path: `${OUT}/${MODE}-sprite-${brn}-${fr}-mega2.png` }); }
    } else st.note = 'không có nút Danh mục';
  }
  st.errs = errs.length; st.err0 = errs[0] || '';
  data.frames[key] = st;
  const bs = before?.frames?.[key];
  const states = ['closed', 'open', 'open2'].filter((s) => st[s]);
  for (const s of states) {
    const a = st[s]; console.log(`  ${key} ${s}: svg trong menu ${a.total}, nhìn thấy ${a.vis.length}${a.vis.length ? ` (cỡ ${a.vis[0].w}×${a.vis[0].h}, use=${a.vis[0].use})` : ''}`);
    if (MODE !== 'after' || !bs?.[s]) continue;
    const bv = bs[s].vis, av = a.vis;
    ok(av.length === bv.length, `${key} ${s}: icon nhìn thấy before ${bv.length} = after ${av.length}`);
    let dS = 0, dC = 0, dA = 0; bv.forEach((x, i) => { const y = av[i]; if (!y) return; dS = Math.max(dS, Math.abs(x.w - y.w), Math.abs(x.h - y.h)); dC = Math.max(dC, Math.hypot(x.rx - y.rx, x.ry - y.ry)); dA = Math.max(dA, Math.hypot(x.x - y.x, x.y - y.y)); });
    ok(dA <= 1, `${key} ${s}: vị trí icon trên màn lệch ${dA.toFixed(2)}px (≤ 1 — kiểm thêm vì cắt khoảng trắng template)`);
    ok(dS <= 1, `${key} ${s}: cỡ icon lệch ${dS.toFixed(2)}px (≤ 1)`); ok(dC <= 1, `${key} ${s}: tâm icon trong phần tử cha lệch ${dC.toFixed(2)}px (≤ 1)`);
    ok(av.every((y) => y.hidden === 'true'), `${key} ${s}: mọi svg aria-hidden="true" (${av.filter((y) => y.hidden === 'true').length}/${av.length})`);
    const bc = bs[s + 'Crops'] || [], ac = st[s + 'Crops'] || []; let worst = 0;
    for (let i = 0; i < Math.min(bc.length, ac.length); i++) { const d = await diff(durl(bc[i]), durl(ac[i])); worst = Math.max(worst, d.ratio); }
    ok(worst <= 0.02, `${key} ${s}: ảnh cắt ${Math.min(bc.length, ac.length)} icon — khác before lớn nhất ${(worst * 100).toFixed(2)} % (≤ 2 %)`);
  }
  if (st.esc) { console.log(`  ${key} Escape: drawer mở=${st.esc.open}, focus=${st.esc.focus}`);
    if (MODE === 'after' && bs?.esc) ok(st.esc.open === bs.esc.open && st.esc.focus === bs.esc.focus, `${key} Escape như before (mở=${bs.esc.open}, focus=${bs.esc.focus})`); }
  if (MODE === 'after') ok(errs.length === 0, `${key}: lỗi JS = ${errs.length}${errs.length ? ' — ' + errs[0] : ''}`);
  else console.log(`  ${key}: lỗi JS = ${errs.length} ${st.err0}`);
  await b.close();
}
await cmpBrowser.close();
fs.writeFileSync(`${OUT}/sprite-${MODE}.json`, JSON.stringify(data, null, 1));
console.log(MODE === 'after' ? (fails.length ? `KẾT QUẢ: CHƯA ĐẠT (${fails.length})` : 'KẾT QUẢ: ĐẠT') : 'Đã ghi sprite-before.json');
process.exit(MODE === 'after' && fails.length ? 1 : 0);
