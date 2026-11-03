// N43 — chẩn đoán dao động focusNoRing d1440 /collections/all.
// Tái hiện ĐÚNG luồng checkPage của scripts/ui-verify.mjs (goto load → 800ms → settle → measure-free → cuộn giữa → axe → Tab 40 lần)
// và in ĐỦ chuỗi 40 phần tử nhận focus (không chỉ mẫu 6) để so giữa các lượt.
// Chạy: node ui-loop/checks/N43.mjs <số lượt> [path]
import { chromium } from 'playwright';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AXE_SRC = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = 'http://localhost:3000';
const N = +(process.argv[2] || 5); const P = process.argv[3] || '/collections/all';
const OUT = 'ui-loop/evidence/N43'; fs.mkdirSync(OUT, { recursive: true });

async function settle(page) {
  await page.evaluate(async () => { for (let y = 0, i = 0; y < document.body.scrollHeight && i < 40; y += 700, i++) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
  await page.waitForTimeout(400);
}
const browser = await chromium.launch();
const runs = [];
for (let k = 1; k <= N; k++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
  await page.goto(BASE + P, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(800); await settle(page);
  await page.evaluate(() => scrollTo(0, Math.min(1500, document.body.scrollHeight / 2))); await page.waitForTimeout(400);
  await page.evaluate(() => scrollTo(0, 0));
  await page.addScriptTag({ content: AXE_SRC });
  await page.evaluate(async () => { await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] }); });
  const seq = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    seq.push(await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return '(body)'; const s = getComputedStyle(a); const ok = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (s.boxShadow !== 'none' && /\d/.test(s.boxShadow)); const b = a.getBoundingClientRect(); return (ok ? '  ' : '✗ ') + a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + '.' + String(a.className && a.className.baseVal !== undefined ? a.className.baseVal : a.className).trim().split(/\s+/)[0] + '«' + (a.getAttribute('aria-label') || a.textContent || a.value || '').trim().replace(/\s+/g, ' ').slice(0, 22) + '» y=' + Math.round(b.top + scrollY); }));
  }
  const info = await page.evaluate(() => ({ h: document.body.scrollHeight, vouchers: document.querySelectorAll('button.pc-voucher__take').length, best: document.querySelectorAll('[class*=bestseller] a[href*="/products/"]').length }));
  const none = seq.filter((s) => s.startsWith('✗')).length;
  runs.push({ k, none, seq, info, errs });
  fs.writeFileSync(`${OUT}/seq-${k}.txt`, seq.join('\n') + '\n' + JSON.stringify(info) + '\n');
  console.log(`lượt ${k}: focusNoRing ${none} · cao trang ${info.h} · voucher «Lấy mã» ${info.vouchers} · lỗi JS ${errs.length}`);
  await ctx.close();
}
await browser.close();
// So chuỗi: in các vị trí khác giữa các lượt
const base = runs[0].seq; let diff = 0;
for (const r of runs.slice(1)) for (let i = 0; i < 40; i++) if (r.seq[i] !== base[i]) { diff++; console.log(`  khác lượt ${r.k} vị trí ${i + 1}: «${base[i]}» ≠ «${r.seq[i]}»`); }
console.log('Chuỗi lượt 1:\n' + base.map((s, i) => String(i + 1).padStart(2) + ' ' + s).join('\n'));
const vals = [...new Set(runs.map((r) => r.none))];
console.log(`focusNoRing các lượt: ${runs.map((r) => r.none).join(', ')} — ${vals.length === 1 ? 'ỔN ĐỊNH' : 'DAO ĐỘNG'} · số vị trí khác: ${diff}`);
process.exit(vals.length === 1 ? 0 : 1);
