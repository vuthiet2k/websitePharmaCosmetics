// 09/11/2026 — khối «Giải pháp cho từng vấn đề» desktop: thẻ ảnh 4:3 thẳng hàng, dải sương trắng, tên 1 dòng nét 500, dòng phụ hiện khi rê chuột; mobile không đổi
import { chromium, webkit } from 'playwright';
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✗ ') + m); if (!c) fail++; };
for (const [n, eng, opt] of [['1440', chromium, { viewport: { width: 1440, height: 900 } }], ['1024', chromium, { viewport: { width: 1024, height: 800 } }], ['1280-webkit', webkit, { viewport: { width: 1280, height: 800 } }], ['390', chromium, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
  console.log('==', n); const b = await eng.launch(); const p = await b.newPage(opt); await p.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const g = document.querySelector('.pc-h4-concerns'); const items = [...g.children].filter(e => getComputedStyle(e).display !== 'none');
    const rows = {}; for (const e of items) { const r = e.getBoundingClientRect(); const k = Math.round(r.top); (rows[k] = rows[k] || []).push(Math.round(r.height)); }
    const ts = [...document.querySelectorAll('.pc-h4-con__t')]; const t = ts[0], cs = getComputedStyle(t);
    return { rows: Object.values(rows), lines: ts.map(e => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight))), fw: cs.fontWeight, bg: cs.backgroundColor, color: cs.color, d: getComputedStyle(document.querySelector('.pc-h4-con__d')).opacity, dDisp: getComputedStyle(document.querySelector('.pc-h4-con__d')).display }; });
  ok(r.rows.every(row => row.every(h => Math.abs(h - row[0]) <= 1)), 'các thẻ cùng hàng cao bằng nhau ' + JSON.stringify(r.rows));
  if (n !== '390') {
    ok(r.lines.every(l => l === 1), 'tên 1 dòng ở mọi thẻ ' + JSON.stringify(r.lines));
    ok(r.fw === '500' && r.bg === 'rgba(0, 0, 0, 0)', `nét ${r.fw}, không nền khối (${r.bg}), màu ${r.color}`);
    ok(r.d === '0', 'dòng phụ ẩn khi chưa rê chuột');
    await p.locator('.pc-h4-con').first().hover(); await p.waitForTimeout(500);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.pc-h4-con__d')).opacity) === '1', 'rê chuột ⇒ dòng phụ hiện');
  } else ok(r.dDisp === 'none', 'mobile: dòng phụ vẫn ẩn như cũ (Main.png)');
  await b.close(); }
console.log(fail ? `FAIL ${fail}` : 'PASS'); process.exit(fail ? 1 : 0);
