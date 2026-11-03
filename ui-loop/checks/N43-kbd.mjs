// N43 — kiểm khối voucher /collections/all: nút «Voucher trước/sau» không được làm mất focus khi tự ẩn.
// 7 khung (Chromium 390/320/768/1024/1440/844×390 + WebKit iPhone 13): chụp khối voucher, đo nút điều hướng.
// Desktop (≥1024): focus «Voucher sau» → Enter tới cuối track → focus không bao giờ về body; rồi «Voucher trước» → Enter về đầu.
// Mọi khung: Tab qua hết khối voucher (từ «Tất cả sản phẩm» breadcrumb) → ghi chuỗi; 0 lần activeElement = body giữa chuỗi.
// Chạy: node ui-loop/checks/N43-kbd.mjs <before|after>
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const TAG = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/N43'; fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3000/collections/all';
const FRAMES = [
  ['chromium', '390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ['webkit', 'iphone13', devices['iPhone 13']],
  ['chromium', '320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }],
  ['chromium', '768', { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }],
  ['chromium', '1024', { viewport: { width: 1024, height: 768 } }],
  ['chromium', '1440', { viewport: { width: 1440, height: 900 } }],
  ['chromium', '844x390', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }],
];
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✗ ') + m); if (!c) fail++; };
const active = (page) => page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return 'body'; return a.tagName.toLowerCase() + '.' + String(a.className).split(' ')[0] + '«' + (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 20) + '»'; });
const navState = (page) => page.evaluate(() => { const t = document.querySelector('[data-pc-vouchers-track]'); const p = document.querySelector('[data-pc-vouchers-prev]'); const n = document.querySelector('[data-pc-vouchers-next]'); const vis = (e) => { const b = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && !e.hidden && b.width > 0; }; const sz = (e) => { const b = e.getBoundingClientRect(); return Math.round(b.width) + '×' + Math.round(b.height); };
  return { sl: Math.round(t.scrollLeft), max: t.scrollWidth - t.clientWidth, prev: vis(p), next: vis(n), prevSz: sz(p), nextSz: sz(n), ring: (() => { const s = getComputedStyle(n); return s.outlineStyle + ' ' + s.outlineWidth; })() }; });
const browsers = { chromium: await chromium.launch(), webkit: await webkit.launch() };
for (const [bn, fn, opt] of FRAMES) {
  console.log(`== ${bn} ${fn}`);
  const ctx = await browsers[bn].newContext({ ...opt, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(800);
  const box = page.locator('[data-pc-vouchers]');
  await box.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  const st0 = await navState(page);
  const bb = await box.boundingBox();
  console.log(`  khối voucher ${Math.round(bb.width)}×${Math.round(bb.height)} · track scrollLeft ${st0.sl}/${st0.max} · prev ${st0.prev} ${st0.prevSz} · next ${st0.next} ${st0.nextSz}`);
  await box.screenshot({ path: `${OUT}/${TAG}-${bn}-${fn}.png` });
  // Chuỗi Tab qua khối voucher: focus link breadcrumb cuối rồi Tab 16 lần, ghi activeElement sau 0ms và sau 250ms
  await page.evaluate(() => { const a = [...document.querySelectorAll('a')].find((x) => /Tất cả sản phẩm/.test(x.textContent) && x.getBoundingClientRect().width > 0); (a || document.body).focus(); });
  const seq = []; let lost = 0;
  for (let i = 0; i < 16; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(250); const a = await active(page); seq.push(a); if (a === 'body') lost++; }
  console.log('  Tab: ' + seq.join(' → '));
  ok(lost === 0, `Tab qua khối voucher: focus về body ${lost} lần`);
  // Shift+Tab ngược lại 16 lần
  const back = []; let lostB = 0;
  for (let i = 0; i < 16; i++) { await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(250); const a = await active(page); back.push(a); if (a === 'body') lostB++; }
  console.log('  Shift+Tab: ' + back.join(' → '));
  ok(lostB === 0, `Shift+Tab qua khối voucher: focus về body ${lostB} lần`);
  const vw = await page.evaluate(() => innerWidth);
  if (vw >= 768) { // CSS page_collection: nút điều hướng ẩn ở < 768px
    await page.evaluate(() => { const t = document.querySelector('[data-pc-vouchers-track]'); t.scrollLeft = 0; });
    await page.waitForTimeout(300);
    const s1 = await navState(page);
    ok(!s1.prev && s1.next, `đầu track: prev ẩn (${!s1.prev}), next hiện (${s1.next}) · max ${s1.max}px`);
    await page.focus('[data-pc-vouchers-next]');
    const nx = []; let lostN = 0;
    // bấm Enter tới khi focus rời «Voucher sau» (tới cuối) hoặc hết 8 lần
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); const a = await active(page); const s = await navState(page); nx.push(`${s.sl}:${a.includes('sau') ? 'sau' : a.includes('trước') ? 'trước' : a}`); if (a === 'body') lostN++; if (!a.includes('sau')) break; }
    const sEnd = await navState(page);
    console.log('  Enter «Voucher sau» ×8: ' + nx.join(' · '));
    ok(lostN === 0, `Enter «Voucher sau» tới cuối: focus về body ${lostN} lần`);
    ok(sEnd.sl >= sEnd.max - 2 && sEnd.prev && !sEnd.next, `cuối track: scrollLeft ${sEnd.sl}/${sEnd.max}, prev hiện, next ẩn`);
    await page.screenshot({ path: `${OUT}/${TAG}-${bn}-${fn}-end-focus.png`, clip: await box.boundingBox() });
    const pv = []; let lostP = 0;
    if ((await active(page)).includes('trước')) {
      for (let i = 0; i < 8; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); const a = await active(page); const s = await navState(page); pv.push(`${s.sl}:${a.includes('sau') ? 'sau' : a.includes('trước') ? 'trước' : a}`); if (a === 'body') lostP++; if (!a.includes('trước')) break; }
      console.log('  Enter «Voucher trước» ×8: ' + pv.join(' · '));
    } else { lostP = -1; console.log('  (focus không ở «Voucher trước» sau khi tới cuối — bỏ lượt ngược)'); }
    ok(lostP === 0, `Enter «Voucher trước» về đầu: focus về body ${lostP} lần`);
    const aStart = await active(page);
    ok(aStart.includes('sau'), `về đầu: focus nằm ở «Voucher sau» (${aStart})`);
    const sStart = await navState(page);
    ok(sStart.sl <= 2 && !sStart.prev && sStart.next, `về đầu track: scrollLeft ${sStart.sl}, prev ẩn, next hiện`);
    // viền focus của nút đang giữ focus (ghi số đo, không phải tiêu chí N43 — N43 chỉ ổn định mốc)
    const ring = await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return a.getAttribute('aria-label') + ' outline ' + s.outlineStyle + ' ' + s.outlineWidth + ' box-shadow ' + s.boxShadow; });
    console.log('  focus cuối: ' + ring);
    await page.screenshot({ path: `${OUT}/${TAG}-${bn}-${fn}-start-focus.png`, clip: await box.boundingBox() });
  } else {
    ok(!st0.prev && !st0.next, `< 768px: 2 nút điều hướng không hiện (prev ${st0.prev}, next ${st0.next})`);
  }
  ok(errs.length === 0, `lỗi JS ${errs.length} ${errs.join(' | ')}`);
  await ctx.close();
}
await browsers.chromium.close(); await browsers.webkit.close();
console.log(`${TAG}: ${fail ? 'CHƯA ĐẠT ' + fail : 'ĐẠT'}`);
process.exit(fail ? 1 : 0);
