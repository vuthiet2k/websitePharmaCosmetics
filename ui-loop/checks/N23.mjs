// N23 (vòng 45, 30/10/2026): chẩn đoán tốc độ /dat-lich-tu-van và /?tpl=login so baseline 23/10.
// Cùng điều kiện ui-verify --perf (390, DPR 3, 4G 1,6 Mbps / RTT 150ms, CPU 4×, tắt cache, trung vị 3 lần) + ghi chi tiết:
// cỡ HTML, từng request (bắt đầu/kết thúc, byte, chặn hiển thị), phần tử LCP, long task.
// Chạy: node ui-loop/checks/N23.mjs [nhãn] [trang…]   (kết quả: ui-loop/evidence/N23/<nhãn>.json)
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'http://localhost:3000';
const OUT = 'ui-loop/evidence/N23';
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const LABEL = args[0] && !args[0].startsWith('/') ? args.shift() : 'run';
const PAGES = args.length ? args : ['/dat-lich-tu-van', '/?tpl=login', '/'];
const RUNS = 3;
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function once(br, pth, k) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(() => {
    window.__lcp = 0; window.__lcpEl = ''; window.__lt = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__lcp = e.startTime; const el = e.element;
      window.__lcpEl = el ? (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '') + ' "' + (el.textContent || '').trim().slice(0, 50) + '"') : ''; window.__lcpUrl = e.url; window.__lcpSize = e.size; } })
      .observe({ type: 'largest-contentful-paint', buffered: true });
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
  await p.goto(BASE + pth, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0;
    const res = performance.getEntriesByType('resource').map((x) => ({ n: x.name.replace(location.origin, '').slice(0, 110), t: x.initiatorType,
      s: Math.round(x.startTime), e: Math.round(x.responseEnd), kb: Math.round((x.transferSize || x.encodedBodySize || 0) / 1024), rb: x.renderBlockingStatus || '' }));
    const blocking = [...document.querySelectorAll('head link[rel=stylesheet]:not([media=print]), head script[src]:not([async]):not([defer]):not([type=module])')]
      .map((e) => (e.href || e.src).replace(location.origin, ''));
    const inlineStyleKb = Math.round([...document.querySelectorAll('style')].reduce((a, s) => a + s.textContent.length, 0) / 1024);
    const inlineScriptKb = Math.round([...document.querySelectorAll('script:not([src])')].reduce((a, s) => a + s.textContent.length, 0) / 1024);
    const svgKb = Math.round([...document.querySelectorAll('svg')].reduce((a, s) => a + s.outerHTML.length, 0) / 1024);
    return { fcp: Math.round(fcp), lcp: Math.round(window.__lcp), lcpEl: window.__lcpEl, lcpUrl: (window.__lcpUrl || '').replace(location.origin, ''),
      ttfb: Math.round(nav.responseStart), htmlEnd: Math.round(nav.responseEnd), htmlKb: Math.round(nav.transferSize / 1024), htmlBodyKb: Math.round(nav.decodedBodySize / 1024),
      dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), longtasks: window.__lt, tbt: window.__lt.reduce((a, [, d]) => a + Math.max(0, d - 50), 0),
      nRes: res.length, kbRes: res.reduce((a, x) => a + x.kb, 0), blocking, inlineStyleKb, inlineScriptKb, svgKb, nDom: document.getElementsByTagName('*').length, res };
  });
  r.errs = errs; await ctx.close(); return r;
}

const br = await chromium.launch();
const out = { label: LABEL, stamp: new Date().toISOString(), pages: [] };
for (const pth of PAGES) {
  const runs = []; for (let k = 0; k < RUNS; k++) runs.push(await once(br, pth, k));
  const m = { path: pth, fcp: med(runs.map((x) => x.fcp)), lcp: med(runs.map((x) => x.lcp)), tbt: med(runs.map((x) => x.tbt)),
    ttfb: med(runs.map((x) => x.ttfb)), htmlEnd: med(runs.map((x) => x.htmlEnd)), runs };
  out.pages.push(m);
  const r0 = runs[0];
  console.log(`\n== ${pth} [${LABEL}] FCP ${runs.map((x) => x.fcp).join('/')} → ${m.fcp} · LCP ${runs.map((x) => x.lcp).join('/')} → ${m.lcp} · TBT ${m.tbt} · TTFB ${m.ttfb} · HTML xong ${m.htmlEnd} ms`);
  console.log(`   HTML ${r0.htmlKb} KB truyền / ${r0.htmlBodyKb} KB giải nén · style nội tuyến ${r0.inlineStyleKb} KB · script nội tuyến ${r0.inlineScriptKb} KB · svg ${r0.svgKb} KB · DOM ${r0.nDom} · request ${r0.nRes} (${r0.kbRes} KB) · lỗi JS ${r0.errs.length}`);
  console.log(`   LCP: ${r0.lcpEl} ${r0.lcpUrl || ''}`);
  console.log(`   chặn hiển thị (${r0.blocking.length}): ${r0.blocking.join(' , ')}`);
  console.log(`   long task > 200ms: ${r0.longtasks.filter(([, d]) => d > 200).map(([s, d]) => s + '+' + d).join(' ')}`);
  const top = r0.res.filter((x) => x.s < m.fcp + 500).sort((a, b) => b.e - a.e).slice(0, 14);
  for (const x of top) console.log(`     ${String(x.s).padStart(6)}→${String(x.e).padStart(6)} ${String(x.kb).padStart(5)}KB ${x.rb.padEnd(12)} ${x.n}`);
}
await br.close();
fs.writeFileSync(`${OUT}/${LABEL}.json`, JSON.stringify(out, null, 1));
