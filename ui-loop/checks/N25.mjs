// N25 (31/10/2026) — Xác định nguồn chậm chung (máy bận hay mã) bằng đo trên trình duyệt thật.
// 1) TTFB server (không giả lập mạng) 3 lần/trang.
// 2) A/B xen kẽ cùng lúc, cùng máy, cùng điều kiện ui-verify --perf (390, DPR 3, 4G 1,6 Mbps/RTT 150, CPU 4×):
//    A = nguyên trang · B = chặn 8 file font Montserrat tự host (thêm từ N19/D06, không có ở baseline 23/10).
//    Xen kẽ A/B nên nhiễu máy ảnh hưởng đều 2 nhánh ⇒ chênh lệch LCP = phần do mã (font).
// 3) Ảnh chụp trang chủ + giỏ ở 8 khung (Chromium + WebKit iPhone 13) để xác nhận trang hiển thị đủ.
// Chạy: node ui-loop/checks/N25.mjs [--no-shots] [--runs=3]
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3000';
const RUNS = +((process.argv.find((a) => a.startsWith('--runs=')) || '--runs=3').split('=')[1]);
const PAGES = ['/', '/?tpl=cart', '/dat-lich-tu-van', '/?tpl=login'];
const OUT = 'ui-loop/evidence/N25';
fs.mkdirSync(OUT, { recursive: true });
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

// 1) TTFB
console.log('== TTFB server (fetch, không giả lập mạng)');
for (const p of PAGES) { const t = []; let kb = 0;
  for (let i = 0; i < 3; i++) { const s = performance.now(); const r = await fetch(BASE + p); const h = await r.text(); t.push(Math.round(performance.now() - s)); kb = Math.round(Buffer.byteLength(h) / 1024); }
  console.log(`  ${p.padEnd(18)} ${t.join(' / ')} ms · HTML ${kb} KB`); }

// 2) A/B
const cr = await chromium.launch();
async function load(pth, blockFonts) {
  const ctx = await cr.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  if (blockFonts) await p.route(/montserrat-\d+-latin(-ext)?\.woff2/, (r) => r.abort());
  await p.addInitScript(() => { window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); });
  let r;
  try { await p.goto(BASE + pth, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(2500);
    r = await p.evaluate(() => { const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0; const res = performance.getEntriesByType('resource'); const kb = res.reduce((a, x) => a + (x.transferSize || 0), performance.getEntriesByType('navigation')[0].transferSize || 0) / 1024; const fontKb = res.filter((x) => /montserrat/.test(x.name)).reduce((a, x) => a + (x.transferSize || 0), 0) / 1024; return { fcp: Math.round(fcp), lcp: Math.round(window.__lcp), kb: Math.round(kb), fontKb: Math.round(fontKb) }; });
  } catch (e) { r = { fcp: -1, lcp: -1, kb: 0, fontKb: 0, err: e.message.slice(0, 60) }; }
  await ctx.close(); return r;
}
console.log(`\n== A/B xen kẽ (4G, CPU 4×, ${RUNS} lần mỗi nhánh): A = nguyên trang, B = chặn font Montserrat tự host`);
const ab = {};
for (const pth of PAGES) { const A = [], B = [];
  for (let k = 0; k < RUNS; k++) { const first = k % 2 === 0; const x = await load(pth, !first); const y = await load(pth, first); (first ? A : B).push(x); (first ? B : A).push(y); }
  const s = (arr, f) => med(arr.map((x) => x[f]));
  ab[pth] = { A: { fcp: s(A, 'fcp'), lcp: s(A, 'lcp'), kb: s(A, 'kb'), fontKb: s(A, 'fontKb'), all: A.map((x) => x.lcp) }, B: { fcp: s(B, 'fcp'), lcp: s(B, 'lcp'), kb: s(B, 'kb'), all: B.map((x) => x.lcp) } };
  console.log(`  ${pth.padEnd(18)} A: FCP ${ab[pth].A.fcp} LCP ${ab[pth].A.lcp} (${ab[pth].A.all.join('/')}) ${ab[pth].A.kb} KB, font ${ab[pth].A.fontKb} KB | B: FCP ${ab[pth].B.fcp} LCP ${ab[pth].B.lcp} (${ab[pth].B.all.join('/')}) ${ab[pth].B.kb} KB | ΔLCP ${ab[pth].A.lcp - ab[pth].B.lcp} ms`); }
fs.writeFileSync(`${OUT}/ab.json`, JSON.stringify(ab, null, 1));

// 3) Ảnh 8 khung
if (!process.argv.includes('--no-shots')) {
  const wk = await webkit.launch();
  const VPS = [['chromium', '390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], ['webkit', '390', devices['iPhone 13']], ['chromium', '320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }], ['chromium', '768', { viewport: { width: 768, height: 1024 } }], ['chromium', '1024', { viewport: { width: 1024, height: 768 } }], ['chromium', '1440', { viewport: { width: 1440, height: 900 } }], ['webkit', '1440', { viewport: { width: 1440, height: 900 } }], ['chromium', '844x390', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }]];
  console.log('\n== Ảnh + font đã nạp');
  for (const [bn, name, opt] of VPS) { const br = bn === 'webkit' ? wk : cr; const ctx = await br.newContext(opt); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    for (const [pth, tag] of [['/', 'home'], ['/?tpl=cart', 'cart']]) { await p.goto(BASE + pth, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(1500);
      const m = await p.evaluate(async () => { await document.fonts.ready; const loaded = [...document.fonts].filter((f) => f.family.replace(/"/g, '') === 'Montserrat' && f.status === 'loaded').map((f) => f.weight); const h = document.querySelector('h1, h2'); return { fontsLoaded: [...new Set(loaded)].join(','), heading: h ? getComputedStyle(h).fontFamily.slice(0, 30) : '', sw: document.documentElement.scrollWidth, vw: innerWidth }; });
      await p.screenshot({ path: `${OUT}/after-${bn}-${name}-${tag}.png` });
      console.log(`  ${bn} ${name} ${tag}: Montserrat đã nạp [${m.fontsLoaded}] · tiêu đề "${m.heading}" · scrollWidth ${m.sw}/${m.vw} · lỗi JS ${errs.length}`); }
    await ctx.close(); }
  await wk.close();
}
await cr.close();
