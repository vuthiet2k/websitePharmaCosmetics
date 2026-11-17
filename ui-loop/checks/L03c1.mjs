// L03c1 — preview mô phỏng img_url của Sapo cho ảnh CDN bizweb (…/100/… + cỡ ⇒ …/thumb/<cỡ>/100/…).
// Chạy:
//   node ui-loop/checks/L03c1.mjs html <nhãn>      → lưu HTML 10 trang PERF vào ui-loop/evidence/L03c1/html-<nhãn>/
//   node ui-loop/checks/L03c1.mjs diff <a> <b>     → so HTML: sau khi đưa URL bizweb /thumb/<cỡ>/ của <b> về URL gốc,
//                                                     liệt kê dòng còn khác (tiêu chí b: chỉ khác ở URL bizweb có cỡ)
//   node ui-loop/checks/L03c1.mjs measure <nhãn>   → (a) /collections/all + /skinhealthy-services, Chromium 390 DPR 3 + 1440 DPR 1,
//                                                     cuộn hết trang: ảnh nhìn thấy > 200 KB, natural ảnh bizweb, ảnh lỗi;
//                                                     (c) 7 khung (+ WebKit iPhone 13) × 4 trang: ảnh lỗi (naturalWidth 0), ảnh thẻ SP, ảnh chụp
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3000';
const OUT = 'ui-loop/evidence/L03c1'; fs.mkdirSync(OUT, { recursive: true });
const PERF = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/soi-da', '/tin-tuc',
  '/blogs/tin-tuc-va-kien-thuc/retinol-thanh-phan-vang-chong-lao-hoa', '/skinhealthy-services', '/dat-lich-tu-van', '/?tpl=login'];
const slug = (p) => (p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home').slice(0, 40);
const SIZES = 'pico|icon|thumb|small|compact|medium|large|grande|1024x1024|2048x2048';
const [mode, a1, a2] = process.argv.slice(2);

if (mode === 'html') {
  const dir = `${OUT}/html-${a1}`; fs.mkdirSync(dir, { recursive: true });
  for (const p of PERF) { const r = await fetch(BASE + p); const t = await r.text(); fs.writeFileSync(`${dir}/${slug(p)}.html`, t); console.log(r.status, p, t.length); }
} else if (mode === 'diff') {
  let total = 0, thumbs = 0;
  for (const p of PERF) {
    const A = fs.readFileSync(`${OUT}/html-${a1}/${slug(p)}.html`, 'utf8');
    const Braw = fs.readFileSync(`${OUT}/html-${a2}/${slug(p)}.html`, 'utf8');
    const n = (Braw.match(new RegExp(`bizweb\\.dktcdn\\.net/thumb/(${SIZES})/`, 'g')) || []).length - (A.match(new RegExp(`bizweb\\.dktcdn\\.net/thumb/(${SIZES})/`, 'g')) || []).length;
    // chỉ hoàn nguyên các /thumb/ MỚI: so theo dòng, mỗi dòng của B bỏ /thumb/<cỡ>/ rồi so với dòng A cũng bỏ /thumb/<cỡ>/
    const norm = (s) => s.replace(new RegExp(`(bizweb\\.dktcdn\\.net/)thumb/(${SIZES})/`, 'g'), '$1');
    const la = A.split('\n'), lb = Braw.split('\n');
    const diffs = [];
    for (let i = 0; i < Math.max(la.length, lb.length); i++) {
      if (la[i] === lb[i]) continue;
      if (la[i] !== undefined && lb[i] !== undefined && norm(la[i]) === norm(lb[i])) continue;
      diffs.push(i + 1);
    }
    total += diffs.length; thumbs += n;
    console.log(`${p.padEnd(70)} dòng A ${la.length} / B ${lb.length} · URL /thumb/ thêm ${n} · dòng khác ngoài URL bizweb: ${diffs.length}${diffs.length ? ' (dòng ' + diffs.slice(0, 8).join(', ') + ')' : ''}`);
    for (const d of diffs.slice(0, 3)) console.log('   A:', (la[d - 1] || '').trim().slice(0, 180), '\n   B:', (lb[d - 1] || '').trim().slice(0, 180));
  }
  console.log(`TỔNG: URL /thumb/ thêm ${thumbs} · dòng khác ngoài URL bizweb ${total}`);
} else if (mode === 'diff2') {
  // So theo LCS (git diff --no-index) sau khi bỏ /thumb/<cỡ>/ ở cả hai bản — không lệch dòng khi HTML chèn thêm khối khác
  // (vd thanh DEV TOOLBAR 357cf42). In các dòng thêm/bớt còn lại (gộp đếm) để xét có thuộc việc không.
  const { execFileSync } = await import('node:child_process');
  const norm = (s) => s.replace(new RegExp(`(bizweb\\.dktcdn\\.net/)thumb/(${SIZES})/`, 'g'), '$1');
  const nd = `${OUT}/norm`; fs.rmSync(nd, { recursive: true, force: true });
  for (const side of ['a', 'b']) fs.mkdirSync(`${nd}/${side}`, { recursive: true });
  for (const p of PERF) {
    fs.writeFileSync(`${nd}/a/${slug(p)}.html`, norm(fs.readFileSync(`${OUT}/html-${a1}/${slug(p)}.html`, 'utf8')));
    fs.writeFileSync(`${nd}/b/${slug(p)}.html`, norm(fs.readFileSync(`${OUT}/html-${a2}/${slug(p)}.html`, 'utf8')));
  }
  let out = '';
  try { out = execFileSync('git', ['diff', '--no-index', '-U0', '--no-color', `${nd}/a`, `${nd}/b`], { encoding: 'utf8', maxBuffer: 1 << 28 }); }
  catch (e) { out = e.stdout || ''; }
  const cnt = new Map(); let file = '';
  const perFile = new Map();
  for (const l of out.split('\n')) {
    if (l.startsWith('+++ ')) { file = l.slice(4); continue; }
    if (l.startsWith('--- ') || !/^[-+]/.test(l)) continue;
    const k = l.slice(0, 120).trimEnd(); cnt.set(k, (cnt.get(k) || 0) + 1); perFile.set(file, (perFile.get(file) || 0) + 1);
  }
  for (const [f, n] of perFile) console.log(`${String(n).padStart(5)} dòng khác · ${f}`);
  console.log('--- dòng khác (gộp, đếm) ---');
  for (const [k, n] of [...cnt].sort((x, y) => y[1] - x[1])) console.log(String(n).padStart(4), k);
  fs.rmSync(nd, { recursive: true, force: true });
} else if (mode === 'measure') {
  const LABEL = a1 || 'after';
  const res = { label: LABEL, at: new Date().toISOString(), a: [], c: [] };
  const scrollAll = async (p) => { for (let y = 0; y < 40; y++) { const done = await p.evaluate(() => { scrollBy(0, innerHeight * 0.9); return scrollY + innerHeight >= document.documentElement.scrollHeight - 2; }); await p.waitForTimeout(250); if (done) break; } await p.waitForTimeout(2000); };
  const imgs = (p) => p.evaluate(() => {
    const rs = new Map(performance.getEntriesByType('resource').map((r) => [r.name, r]));
    return [...document.images].map((i) => { const r = i.getBoundingClientRect(); const cs = getComputedStyle(i); const u = i.currentSrc || i.src; const e = rs.get(u);
      return { u, nw: i.naturalWidth, nh: i.naturalHeight, dw: Math.round(r.width), dh: Math.round(r.height), complete: i.complete,
        vis: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none', kb: e ? Math.round((e.encodedBodySize || e.transferSize || 0) / 1024) : null }; });
  });
  const cr = await chromium.launch(); const wk = await webkit.launch();
  // (a)
  for (const pth of ['/collections/all', '/skinhealthy-services']) {
    for (const [w, h, dpr] of [[390, 844, 3], [1440, 900, 1]]) {
      const ctx = await cr.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }); const p = await ctx.newPage();
      await p.goto(BASE + pth, { waitUntil: 'load', timeout: 120000 }); await scrollAll(p);
      const L = await imgs(p); await ctx.close();
      const vis = L.filter((x) => x.vis);
      const big = vis.filter((x) => x.kb > 200);
      const biz = vis.filter((x) => /bizweb\.dktcdn\.net\/(thumb\/[a-z0-9]+\/)?100\/.*\/products\//.test(x.u));
      const broken = vis.filter((x) => x.complete && x.nw === 0);
      const row = { pth, w, dpr, visible: vis.length, totalKB: vis.reduce((s, x) => s + (x.kb || 0), 0), over200: big.map((x) => `${x.kb}KB ${x.nw}x${x.nh}→${x.dw}x${x.dh} ${x.u.slice(0, 110)}`),
        bizProducts: biz.length, bizMaxNatural: Math.max(0, ...biz.map((x) => x.nw)), bizNatural: [...new Set(biz.map((x) => `${x.nw}x${x.nh}→${x.dw}`))].slice(0, 8), broken: broken.map((x) => x.u.slice(0, 120)) };
      res.a.push(row); console.log('(a)', JSON.stringify(row));
    }
  }
  // (c) 7 khung
  const FR = [['chromium', 390, 844], ['webkit', 'iphone13'], ['chromium', 320, 568], ['chromium', 768, 1024], ['chromium', 1024, 768], ['chromium', 1440, 900], ['chromium', 844, 390]];
  for (const pth of ['/collections/all', '/skinhealthy-services', '/', '/products/serum-vitamin-c-15']) {
    for (const f of FR) {
      const isWk = f[0] === 'webkit';
      const ctx = isWk ? await wk.newContext({ ...devices['iPhone 13'] }) : await cr.newContext({ viewport: { width: f[1], height: f[2] } });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 80)));
      await p.goto(BASE + pth, { waitUntil: 'load', timeout: 120000 }); await scrollAll(p);
      const L = await imgs(p);
      const broken = L.filter((x) => x.vis && x.complete && x.nw === 0).map((x) => x.u.slice(0, 120));
      const thumbs = L.filter((x) => x.vis && /bizweb\.dktcdn\.net\/thumb\//.test(x.u)).length;
      const k = isWk ? 'webkit-390' : `chromium-${f[1]}x${f[2]}`;
      // ảnh chụp: cuộn tới thẻ SP đầu (nếu có) để thấy ảnh thẻ
      await p.evaluate(() => { const el = document.querySelector('.pc-pcard img, .product-card img, .item_product_main img, main img[src*="products"]'); if (el) el.scrollIntoView({ block: 'center' }); else scrollTo(0, 0); });
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${OUT}/${LABEL}-${k}-${slug(pth)}.png` });
      const row = { pth, k, imgs: L.filter((x) => x.vis).length, thumbs, broken, jsErr: errs.length };
      res.c.push(row); console.log('(c)', JSON.stringify(row));
      await ctx.close();
    }
  }
  await cr.close(); await wk.close();
  fs.writeFileSync(`${OUT}/${LABEL}.json`, JSON.stringify(res, null, 1));
} else console.log('Cách dùng: html <nhãn> | diff <a> <b> | measure <nhãn>');
