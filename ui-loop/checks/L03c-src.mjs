// L03c — tìm khối/HTML sinh ra các ảnh bị gắn cờ ở before-detail.txt (390 DPR 3). Chạy: node ui-loop/checks/L03c-src.mjs
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
const JOBS = [
  ['/', ['home_concern_1', 'collections/thie-t-ke-chu-a-co-te-n-85', 'PharmaCosmetics.svg', 'support_mascot', 'flash_-1', 'thie-t-ke-chu-a-co-te-n-10-b77']],
  ['/collections/all', ['die-u-tri-chuye-n-nghie-p.jpg', 'Altreno']],
  ['/skinhealthy-services', ['die-u-tri-chuye-n-nghie-p-09-36']],
  ['/soi-da', ['pharmacosmetics-f1be']],
];
for (const [pth, pats] of JOBS) {
  await p.goto('http://localhost:3000' + pth, { waitUntil: 'load' });
  for (const s of pats) {
    const r = await p.evaluate((s) => {
      const i = [...document.images].find((x) => (x.getAttribute('src') || '').includes(s) || (x.getAttribute('data-src') || '').includes(s));
      if (!i) return 'không thấy';
      const ch = []; let e = i;
      for (let k = 0; k < 7 && e; k++, e = e.parentElement) ch.push(e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '') + (e.id ? '#' + e.id : ''));
      return i.outerHTML.slice(0, 300) + '\n     ' + ch.join(' < ');
    }, s);
    console.log(pth, s, '=>', r);
  }
}
await b.close();
