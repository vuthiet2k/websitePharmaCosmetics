// L03b42 (vòng 113): A/B «fixed>15%» d1440 /dang-ky-lieu-trinh-tri-mun — A = mã hiện tại (không CDN), B = chèn lại link CDN
// Font Awesome (= trước khi sửa). Đo đúng cách ui-verify (settle, cuộn min(1500, cao/2), fixedArea).
// Chạy: node ui-loop/checks/L03b42-fixed.mjs
import { chromium } from 'playwright';
const URL = '/dang-ky-lieu-trinh-tri-mun';
const CDN = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />';
function fixedArea() {
  let area = 0; const vh = innerHeight, vw = innerWidth; const list = [];
  document.querySelectorAll('body *').forEach((el) => { const s = getComputedStyle(el); if ((s.position === 'fixed' || s.position === 'sticky') && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0) {
    const b = el.getBoundingClientRect(); if (b.width < 8 || b.height < 8 || b.bottom <= 0 || b.top >= vh) return;
    for (let p = el.parentElement; p; p = p.parentElement) { const ps = getComputedStyle(p); if (ps.position === 'fixed' || ps.position === 'sticky') return; }
    const a = Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0)) * Math.max(0, Math.min(b.right, vw) - Math.max(b.left, 0)); area += a;
    list.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' ' + Math.round(a / (vw * vh) * 100) + '%'); } });
  return { pct: Math.round(area / (vw * vh) * 100), list };
}
const b = await chromium.launch();
for (const v of ['A', 'B', 'A', 'B']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  if (v === 'B') await p.route('http://localhost:3000' + URL, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace('</head>', CDN + '</head>') }); });
  await p.goto('http://localhost:3000' + URL, { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(800);
  await p.evaluate(async () => { for (let y = 0, i = 0; y < document.body.scrollHeight && i < 40; y += 700, i++) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
  await p.waitForTimeout(400);
  await p.evaluate(() => scrollTo(0, Math.min(1500, document.body.scrollHeight / 2))); await p.waitForTimeout(400);
  const fa = await p.evaluate(fixedArea);
  const cdn = await p.evaluate(() => !!document.querySelector('link[href*="font-awesome"]'));
  console.log(`${v} (CDN ${cdn}): fixed ${fa.pct}% — ${fa.list.join(', ')} · scrollY ${await p.evaluate(() => scrollY)}`);
  await ctx.close();
}
await b.close();
