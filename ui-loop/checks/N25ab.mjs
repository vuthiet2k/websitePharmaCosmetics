// N25 lần 3 (31/10/2026) — tách phần do mã khỏi nhiễu máy cho kết quả sprite ui_icon.
// 1) TTFB server (fetch, không giả lập mạng) 3 lần/trang + byte HTML.
// 2) A/B XEN KẼ cùng máy, cùng điều kiện ui-verify --perf (390, DPR 3, 4G 1,6 Mbps/RTT 150, CPU 4×):
//    A = HTML hiện tại (menu dùng sprite) · B = cùng HTML + chèn 104 KB đệm (script text/x-pad đầu <body>,
//    đúng cỡ phần SVG lặp đã gỡ) ⇒ mô phỏng dung lượng trước sprite. Xen kẽ thứ tự nên nhiễu máy chia đều 2 nhánh.
// Chạy: node ui-loop/checks/N25ab.mjs [--runs=3] [--pages=/,/?tpl=cart]
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3000';
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=').slice(1).join('=');
const RUNS = +arg('runs', 3);
const PAGES = arg('pages', '/,/?tpl=cart,/products/serum-vitamin-c-15,/tin-tuc,/skinhealthy-services').split(',');
const PAD_KB = 104;
const OUT = 'ui-loop/evidence/N25';
fs.mkdirSync(OUT, { recursive: true });
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

console.log('== TTFB server (fetch, không giả lập mạng)');
const ttfb = {};
for (const p of PAGES) { const t = []; const full = []; let kb = 0;
  for (let i = 0; i < 3; i++) { const s = performance.now(); const r = await fetch(BASE + p); const t1 = performance.now(); const h = await r.text(); t.push(Math.round(t1 - s)); full.push(Math.round(performance.now() - s)); kb = +(Buffer.byteLength(h) / 1024).toFixed(1); }
  ttfb[p] = { ttfb: t, full, kb };
  console.log(`  ${p.padEnd(34)} TTFB ${t.join(' / ')} ms · trọn HTML ${full.join(' / ')} ms · ${kb} KB`); }

const PAD = '<script type="text/x-pad">' + 'x'.repeat(PAD_KB * 1024) + '</script>';
const cr = await chromium.launch();
async function load(pth, pad) {
  const ctx = await cr.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // Cả 2 nhánh đi qua route (lấy HTML trước rồi fulfill) để chi phí route như nhau; chỉ B có đệm.
  await p.route((u) => u.href === BASE + pth || u.href === BASE + pth + '/', async (r) => {
    const res = await r.fetch(); let body = await res.text();
    if (pad) body = body.replace(/<body([^>]*)>/i, (m) => m + PAD);
    await r.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(body)) } });
  });
  await p.addInitScript(() => { window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); });
  let r;
  try { await p.goto(BASE + pth, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(2500);
    r = await p.evaluate(() => { const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0; const nav = performance.getEntriesByType('navigation')[0]; return { fcp: Math.round(fcp), lcp: Math.round(window.__lcp), htmlEnd: Math.round(nav.responseEnd), html: document.documentElement.outerHTML.length }; });
  } catch (e) { r = { fcp: -1, lcp: -1, htmlEnd: -1, err: e.message.slice(0, 60) }; }
  await ctx.close(); return r;
}
console.log(`\n== A/B xen kẽ (4G, CPU 4×, ${RUNS} lần/nhánh): A = HTML sprite hiện tại · B = A + ${PAD_KB} KB đệm (≈ trước sprite)`);
const ab = { stamp: new Date().toISOString(), padKB: PAD_KB, ttfb, pages: {} };
for (const pth of PAGES) { const A = [], B = [];
  for (let k = 0; k < RUNS; k++) { const aFirst = k % 2 === 0; const x = await load(pth, !aFirst); const y = await load(pth, aFirst); (aFirst ? B : A).push(x); (aFirst ? A : B).push(y); }
  const s = (arr, f) => med(arr.map((x) => x[f]));
  const res = { A: { fcp: s(A, 'fcp'), lcp: s(A, 'lcp'), htmlEnd: s(A, 'htmlEnd'), all: A.map((x) => x.lcp) }, B: { fcp: s(B, 'fcp'), lcp: s(B, 'lcp'), htmlEnd: s(B, 'htmlEnd'), all: B.map((x) => x.lcp) } };
  res.dLcp = res.B.lcp - res.A.lcp; res.dFcp = res.B.fcp - res.A.fcp; res.dHtml = res.B.htmlEnd - res.A.htmlEnd;
  ab.pages[pth] = res;
  console.log(`  ${pth.padEnd(34)} A: FCP ${res.A.fcp} LCP ${res.A.lcp} (${res.A.all.join('/')}) HTML xong ${res.A.htmlEnd} | B: FCP ${res.B.fcp} LCP ${res.B.lcp} (${res.B.all.join('/')}) HTML xong ${res.B.htmlEnd} | B−A: FCP ${res.dFcp} LCP ${res.dLcp} HTML ${res.dHtml} ms`); }
fs.writeFileSync(`${OUT}/ab-sprite.json`, JSON.stringify(ab, null, 1));
await cr.close();
