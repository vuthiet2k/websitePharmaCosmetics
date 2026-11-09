// L03b42 (vòng 113): ghi nhận vùng trống dưới breadcrumb PDP ở 844×390 (thấy ở ảnh before = after) — đo phần tử đầu tiên
// có nội dung dưới breadcrumb + độ mờ/ảnh theo thời gian. Chạy: node ui-loop/checks/L03b42-pdp844.mjs
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const p = await ctx.newPage();
await p.goto('http://localhost:3000/products/serum-vitamin-c-15', { waitUntil: 'load', timeout: 60000 });
for (const t of [900, 3000, 6000]) {
  await p.waitForTimeout(t === 900 ? 900 : t - 900);
  const m = await p.evaluate(() => {
    const hits = [];
    for (const y of [160, 220, 280]) for (const x of [100, 420, 700]) { const e = document.elementFromPoint(x, y); hits.push(`${x},${y}:${e ? e.tagName + '.' + (e.className + '').slice(0, 30) : '-'}`); }
    const img = document.querySelector('.product-gallery img, .swiper-slide img, main img');
    const r = img?.getBoundingClientRect();
    return { hits, img: img ? { y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width), op: getComputedStyle(img).opacity, done: img.complete && img.naturalWidth > 0 } : null };
  });
  console.log(`${t}ms: ${JSON.stringify(m)}`);
}
await p.screenshot({ path: 'ui-loop/evidence/L03b42/pdp844-6s.png' });
await b.close();
