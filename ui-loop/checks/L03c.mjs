// L03c — kiểm kê ảnh (before) trên 10 trang PERF: ảnh đúng cỡ / srcset / định dạng / lazy / preload LCP.
// Chạy: node ui-loop/checks/L03c.mjs [before|after]  → ui-loop/evidence/L03c/<nhãn>.json + ảnh 390/1440.
// Mỗi trang: (1) Chromium 390 DPR 3 + 1440 DPR 1 không giới hạn mạng: cuộn hết trang để nạp lazy, liệt kê mọi <img> nhìn thấy
// (natural vs hiển thị × DPR, định dạng, byte qua Resource Timing, loading, srcset, có trong màn đầu) + ảnh nền CSS;
// (2) 390 DPR 3, 4G 1,6 Mbps / RTT 150, CPU 4× (giống ui-verify --perf), 1 lượt: phần tử LCP, URL, thời điểm, có preload không.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3000';
const LABEL = process.argv[2] || 'before';
const PAGES = ['/', '/collections/all', '/products/serum-vitamin-c-15', '/?tpl=cart', '/soi-da', '/tin-tuc',
  '/blogs/tin-tuc-va-kien-thuc/retinol-thanh-phan-vang-chong-lao-hoa', '/skinhealthy-services', '/dat-lich-tu-van', '/?tpl=login'];
const OUT = 'ui-loop/evidence/L03c'; fs.mkdirSync(OUT, { recursive: true });
const slug = (p) => (p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home').slice(0, 40);

async function inventory(br, vp, dpr, pth) {
  const ctx = await br.newContext({ viewport: vp, deviceScaleFactor: dpr }); const p = await ctx.newPage();
  await p.goto(BASE + pth, { waitUntil: 'load', timeout: 120000 }); await p.waitForTimeout(800);
  const fold = await p.evaluate(() => innerHeight);
  // ghi ảnh màn đầu trước khi cuộn
  const aboveFold = await p.evaluate(() => [...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0; }).map((i) => i.currentSrc || i.src));
  await p.screenshot({ path: `${OUT}/${LABEL}-chromium-${vp.width}-${slug(pth)}.png` });
  for (let y = 0; y < 30; y++) { const done = await p.evaluate(() => { scrollBy(0, innerHeight * 0.9); return scrollY + innerHeight >= document.documentElement.scrollHeight - 2; }); await p.waitForTimeout(250); if (done) break; }
  await p.waitForTimeout(1500);
  const data = await p.evaluate(({ aboveFold }) => {
    const res = new Map(performance.getEntriesByType('resource').map((r) => [r.name, r]));
    const size = (u) => { const r = res.get(u); return r ? (r.encodedBodySize || r.transferSize || 0) : null; };
    const fmt = (u) => { const m = /^data:image\/([a-z+]+)/.exec(u); if (m) return m[1]; const e = /\.(webp|avif|jpe?g|png|gif|svg)(\?|$)/i.exec(u); return e ? e[1].toLowerCase().replace('jpeg', 'jpg') : (/placehold\.co/.test(u) ? 'svg(placehold)' : '?'); };
    const imgs = [...document.images].map((i) => { const r = i.getBoundingClientRect(); const cs = getComputedStyle(i); const u = i.currentSrc || i.src;
      return { src: u.slice(0, 160), host: (() => { try { return new URL(u).host; } catch (e) { return 'data'; } })(), fmt: fmt(u), nw: i.naturalWidth, nh: i.naturalHeight,
        dw: Math.round(r.width), dh: Math.round(r.height), visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none',
        bytes: size(u), loading: i.getAttribute('loading'), srcset: i.hasAttribute('srcset') || !!(i.parentElement && i.parentElement.tagName === 'PICTURE'), wAttr: i.getAttribute('width'), hAttr: i.getAttribute('height'),
        fold: aboveFold.includes(u), fetchpriority: i.getAttribute('fetchpriority'), alt: i.hasAttribute('alt') }; });
    const bg = new Set(); for (const el of document.querySelectorAll('body *')) { const b = getComputedStyle(el).backgroundImage; if (b && b.includes('url(')) for (const m of b.matchAll(/url\("?([^")]+)"?\)/g)) bg.add(m[1]); }
    const imgRes = performance.getEntriesByType('resource').filter((r) => r.initiatorType === 'img' || r.initiatorType === 'css' && /\.(png|jpe?g|gif|webp|avif|svg)/i.test(r.name) || /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(r.name))
      .map((r) => ({ url: r.name.slice(0, 160), bytes: r.encodedBodySize || r.transferSize || 0, init: r.initiatorType }));
    const preloads = [...document.querySelectorAll('link[rel=preload][as=image]')].map((l) => l.href || l.getAttribute('imagesrcset'));
    return { imgs, bg: [...bg].map((u) => u.slice(0, 160)), imgRes, preloads };
  }, { aboveFold });
  await ctx.close();
  return { fold, ...data };
}

async function lcpRun(br, pth) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(() => { window.__l = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) { const el = e.element; window.__l.push({ t: Math.round(e.startTime), size: e.size, url: (e.url || '').slice(0, 160), tag: el ? el.tagName : null, cls: el ? String(el.className).slice(0, 80) : null, text: el && !e.url ? (el.textContent || '').trim().slice(0, 60) : '' }); } }).observe({ type: 'largest-contentful-paint', buffered: true }); });
  let r = null;
  try { await p.goto(BASE + pth, { waitUntil: 'load', timeout: 180000 }); await p.waitForTimeout(2500);
    r = await p.evaluate(() => { const nav = performance.getEntriesByType('navigation')[0]; const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0;
      const img = performance.getEntriesByType('resource').filter((x) => /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(x.name) || x.initiatorType === 'img');
      return { fcp: Math.round(fcp), html: nav.encodedBodySize, htmlEnd: Math.round(nav.responseEnd), lcp: window.__l[window.__l.length - 1] || null, history: window.__l, imgKB: Math.round(img.reduce((a, x) => a + (x.encodedBodySize || x.transferSize || 0), 0) / 1024), imgN: img.length,
        totalKB: Math.round(performance.getEntriesByType('resource').reduce((a, x) => a + (x.transferSize || x.encodedBodySize || 0), nav.transferSize || 0) / 1024) }; });
    if (r.lcp && r.lcp.url) { const u = r.lcp.url; r.lcpRes = await p.evaluate((u) => { const x = performance.getEntriesByType('resource').find((e) => e.name.startsWith(u.slice(0, 120))); return x ? { start: Math.round(x.startTime), end: Math.round(x.responseEnd), bytes: x.encodedBodySize } : null; }, u); }
  } catch (e) { r = { err: e.message.slice(0, 100) }; }
  await ctx.close(); return r;
}

const cr = await chromium.launch();
const all = {};
for (const pth of PAGES) {
  const m = await inventory(cr, { width: 390, height: 844 }, 3, pth);
  const d = await inventory(cr, { width: 1440, height: 900 }, 1, pth);
  const l = await lcpRun(cr, pth);
  all[pth] = { m390: m, d1440: d, lcp4g: l };
  const sum = (inv, dpr) => { const v = inv.imgs.filter((i) => i.visible && i.nw > 1);
    const over = v.filter((i) => !/svg/.test(i.fmt) && i.dw > 0 && i.nw > i.dw * dpr * 1.5);
    const heavy = v.filter((i) => (i.bytes || 0) > 200 * 1024);
    const noWebp = v.filter((i) => ['jpg', 'png', 'gif'].includes(i.fmt));
    const foldLazy = v.filter((i) => i.fold && i.loading === 'lazy');
    const belowEager = v.filter((i) => !i.fold && i.loading !== 'lazy');
    return `ảnh nhìn thấy ${v.length} · quá cỡ>1,5× ${over.length} · >200KB ${heavy.length} · jpg/png/gif ${noWebp.length} · srcset ${v.filter((i) => i.srcset).length} · màn đầu lazy ${foldLazy.length} · dưới màn đầu không lazy ${belowEager.length} · ảnh res ${inv.imgRes.length} = ${Math.round(inv.imgRes.reduce((a, x) => a + x.bytes, 0) / 1024)}KB · preload ${inv.preloads.length}`; };
  console.log(`\n${pth}\n  390: ${sum(m, 3)}\n  1440: ${sum(d, 1)}\n  4G: ${l && !l.err ? `FCP ${l.fcp} · LCP ${l.lcp ? l.lcp.t : '-'} (${l.lcp ? (l.lcp.url ? l.lcp.tag + ' ' + l.lcp.url : l.lcp.tag + ' «' + l.lcp.text + '»') : '-'}) · HTML ${Math.round(l.html / 1024)}KB xong ${l.htmlEnd}ms · ảnh ${l.imgN} = ${l.imgKB}KB · tổng ${l.totalKB}KB${l.lcpRes ? ` · ảnh LCP nạp ${l.lcpRes.start}→${l.lcpRes.end}ms ${Math.round(l.lcpRes.bytes / 1024)}KB` : ''}` : JSON.stringify(l)}`);
}
fs.writeFileSync(`${OUT}/${LABEL}.json`, JSON.stringify(all, null, 1));
await cr.close();
console.log(`\nĐã ghi ${OUT}/${LABEL}.json`);
