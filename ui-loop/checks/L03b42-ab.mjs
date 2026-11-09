// L03b42 (vòng 113): A/B cao trang /dang-ky-lieu-trinh-tri-mun 390 — A = mã hiện tại (không CDN), B = chèn lại link CDN
// Font Awesome vào <head> qua route (giống before). Chạy: node ui-loop/checks/L03b42-ab.mjs [url]
import { chromium } from 'playwright';
const URL = process.argv[2] || '/dang-ky-lieu-trinh-tri-mun';
const CDN = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />';
const b = await chromium.launch();
for (const variant of ['A', 'B', 'A', 'B']) {
  for (const [fr, opt] of [['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['1440', { viewport: { width: 1440, height: 900 } }]]) {
    const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    if (variant === 'B') await p.route('http://localhost:3000' + URL, async (r) => { const res = await r.fetch(); const body = (await res.text()).replace('</head>', CDN + '</head>'); r.fulfill({ response: res, body }); });
    await p.goto('http://localhost:3000' + URL, { waitUntil: 'load', timeout: 60000 });
    await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
    await p.waitForTimeout(900);
    const m = await p.evaluate(() => {
      const top = [...document.querySelectorAll('main *, body > *')].filter((e) => e.getBoundingClientRect().height > 200).slice(0, 0);
      const secs = [...document.querySelectorAll('section, form, .container')].slice(0, 12).map((e) => `${e.tagName}.${(e.className + '').slice(0, 25)}=${Math.round(e.getBoundingClientRect().height)}`);
      return { h: document.documentElement.scrollHeight, cdn: !!document.querySelector('link[href*="font-awesome"]'), secs };
    });
    console.log(`${variant} ${fr}: CDN ${m.cdn} · cao ${m.h} · ${m.secs.join(' | ')}`);
    await ctx.close();
  }
}
await b.close();
