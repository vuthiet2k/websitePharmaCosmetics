// N28 — khối «Bán chạy» cuối /collections/all (.pc-col-bestseller) chèn thẻ SP bằng IntersectionObserver khi cuộn tới.
// Đo: sau đúng bước cuộn settle() của scripts/ui-verify.mjs (bước 700px, nghỉ 40ms), khối đã chèn thẻ SP chưa — lặp N lượt
// mỗi khung; thêm lượt cuộn thật bằng bánh xe tới khối + bấm nút next slider; chụp ảnh khối.
// Chạy: node ui-loop/checks/N28.mjs [tag]   (tag mặc định "after" — tên ảnh / file kết quả)
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const BASE = 'http://localhost:3000';
const URL = '/collections/all';
const TAG = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/N28'; fs.mkdirSync(OUT, { recursive: true });
const VPS = [
  ['webkit', '390', { ...devices['iPhone 13'] }, 10],
  ['chromium', '390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 10],
  ['chromium', '320', { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }, 3],
  ['chromium', '768', { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }, 3],
  ['chromium', '1024', { viewport: { width: 1024, height: 768 } }, 3],
  ['chromium', '1440', { viewport: { width: 1440, height: 900 } }, 3],
  ['webkit', '1440', { viewport: { width: 1440, height: 900 } }, 3],
  ['chromium', '844x390', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }, 3],
];
// Bản sao NGUYÊN VĂN settle() của scripts/ui-verify.mjs
async function settle(page) {
  await page.evaluate(async () => { for (let y = 0, i = 0; y < document.body.scrollHeight && i < 40; y += 700, i++) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
  await page.waitForTimeout(400);
}
const state = () => {
  const s = document.querySelector('.pc-col-bestseller');
  if (!s) return { exists: false };
  const b = s.getBoundingClientRect();
  const slides = [...s.querySelectorAll('.swiper-slide')];
  return { exists: true, top: Math.round(b.top + scrollY), h: Math.round(b.height), docH: document.body.scrollHeight,
    slides: slides.length, nul: s.querySelectorAll('.item_null').length,
    cards: slides.filter((x) => x.querySelector('.btn-cart, a[href*="/products/"]')).length,
    swiper: !!(s.querySelector('.swiper-container') || {}).swiper };
};
let fail = 0; const lines = [];
const log = (t) => { console.log(t); lines.push(t); };
for (const [bn, vn, opt, runs] of VPS) {
  const browser = await (bn === 'webkit' ? webkit : chromium).launch();
  let ok = 0; const errs = [];
  for (let i = 0; i < runs; i++) {
    const ctx = await browser.newContext({ ...opt, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
    await page.goto(BASE + URL, { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(800);
    await settle(page);
    const st = await page.evaluate(state);
    const pass = st.exists && st.cards >= 4 && st.nul === 0;
    if (pass) ok++;
    log(`${bn} ${vn} lượt ${i + 1}: ${pass ? 'ĐÃ CHÈN' : 'CHƯA CHÈN'} — thẻ SP ${st.cards}, slide ${st.slides}, ô trống ${st.nul}, swiper ${st.swiper}, khối y=${st.top} cao ${st.h}, trang cao ${st.docH}`);
    if (i === 0) { // lượt cuộn thật: mở trang mới, cuộn bánh xe tới khối, chụp ảnh, bấm next
      const p2 = await ctx.newPage(); p2.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));
      await p2.goto(BASE + URL, { waitUntil: 'load', timeout: 60000 }); await p2.waitForTimeout(800);
      const target = await p2.evaluate(() => { const s = document.querySelector('.pc-col-bestseller'); return s ? s.getBoundingClientRect().top + scrollY : 0; });
      if (bn === 'webkit' && opt.hasTouch) { // WebKit di động không có mouse.wheel ⇒ cuộn từng màn bằng scrollBy
        for (let y = 0; y < target; y += 300) { await p2.evaluate(() => scrollBy(0, 300)); await p2.waitForTimeout(60); }
      } else { for (let y = 0; y < target; y += 300) { await p2.mouse.wheel(0, 300); await p2.waitForTimeout(60); } }
      await p2.waitForTimeout(800);
      const s2 = await p2.evaluate(state);
      const sec = p2.locator('.pc-col-bestseller');
      await sec.scrollIntoViewIfNeeded();
      await sec.screenshot({ path: `${OUT}/${TAG}-${bn}-${vn}.png` });
      let moved = 'không có nút next nhìn thấy';
      const nx = p2.locator('.pc-col-bestseller .pc-featured__next');
      if (await nx.isVisible()) {
        const before = await p2.evaluate(() => document.querySelector('.swiper_col_bestseller').swiper?.activeIndex);
        await nx.click({ timeout: 5000 }).catch((e) => { moved = 'bấm lỗi ' + e.message.slice(0, 60); });
        await p2.waitForTimeout(500);
        const after = await p2.evaluate(() => document.querySelector('.swiper_col_bestseller').swiper?.activeIndex);
        if (!moved.startsWith('bấm lỗi')) moved = `activeIndex ${before} → ${after}`;
      }
      log(`${bn} ${vn} cuộn thật: ${s2.cards >= 4 && s2.nul === 0 ? 'ĐÃ CHÈN' : 'CHƯA CHÈN'} — thẻ SP ${s2.cards}, ô trống ${s2.nul}, swiper ${s2.swiper}; next: ${moved}`);
      if (!(s2.cards >= 4 && s2.nul === 0)) fail++;
      await p2.close();
    }
    await ctx.close();
  }
  log(`== ${bn} ${vn}: ${ok}/${runs} lượt đã chèn sau settle(); lỗi JS ${errs.length}${errs.length ? ' — ' + [...new Set(errs)].slice(0, 3).join(' | ') : ''}`);
  if (ok < runs) fail++;
  await browser.close();
}
fs.writeFileSync(`${OUT}/${TAG}.txt`, lines.join('\n') + '\n');
log(fail ? `KẾT QUẢ: CHƯA ĐẠT (${fail})` : 'KẾT QUẢ: ĐẠT');
process.exit(fail ? 1 : 0);
