// 09/11/2026 — «Kết quả thực tế» desktop gọn (chip tab ngang, 1 khung TRƯỚC/SAU có thanh kéo, chip chỉ số, chi tiết trong <details>)
// + header desktop (thanh dính 64px, logo 40px, menu nét 500). Mobile 390 «Kết quả thực tế» giữ nguyên (Main.png).
import { chromium, webkit, devices } from 'playwright';
const SHOT = process.argv[2];
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✗ ') + m); if (!c) fail++; };
for (const [n, eng, opt] of [['1440', chromium, { viewport: { width: 1440, height: 900 } }], ['1024', chromium, { viewport: { width: 1024, height: 800 } }], ['1280-webkit', webkit, { viewport: { width: 1280, height: 800 } }], ['390', chromium, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['iphone13', webkit, devices['iPhone 13']]]) {
  console.log('==', n); const b = await eng.launch(); const p = await b.newPage(opt);
  await p.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 90000 }); await p.addStyleTag({ content: '#dev-toolbar,.main-widget{display:none!important}' }); await p.waitForTimeout(800);
  const sec = p.locator('section[aria-labelledby="pc-h4-testi-title"]'); await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  const m = await p.evaluate(() => { const R = e => e ? e.getBoundingClientRect() : null; const s = document.querySelector('section[aria-labelledby="pc-h4-testi-title"]');
    const c = s.querySelector('.pc-h4-case:not([hidden])'); const imgs = c.querySelectorAll('.pc-h4-case__img'); const ba = c.querySelector('.pc-h4-case__ba');
    const tabs = [...s.querySelectorAll('.pc-h4-case-tab')].map(t => R(t)); const d = c.querySelector('.pc-h4-case__more');
    return { secH: Math.round(R(s).height), tabsRow: new Set(tabs.map(t => Math.round(t.top))).size, tabH: Math.min(...tabs.map(t => Math.round(t.height))), sameFrame: imgs.length === 2 && Math.abs(R(imgs[0]).left - R(imgs[1]).left) < 1,
      ba: !!ba && getComputedStyle(ba).display !== 'none', chips: c.querySelectorAll('.pc-h4-case__chips li').length, chipsVis: !!c.querySelector('.pc-h4-case__chips') && getComputedStyle(c.querySelector('.pc-h4-case__chips')).display !== 'none',
      details: d && getComputedStyle(d).display, open: d && d.open, sum: !!c.querySelector('.pc-h4-case__sum') && getComputedStyle(c.querySelector('.pc-h4-case__sum')).display !== 'none', w: innerWidth }; });
  console.log('  ', JSON.stringify(m));
  if (m.w >= 1024) {
    ok(m.tabsRow === 1 && m.tabH >= 44, `tab = 1 hàng ngang, cao ≥ 44 (${m.tabH})`);
    ok(m.sameFrame && m.ba, 'TRƯỚC / SAU chung 1 khung + thanh kéo');
    ok(m.chipsVis && m.chips >= 1 && m.sum, `${m.chips} chip chỉ số + tóm tắt hiện`);
    ok(m.details !== 'none' && !m.open, 'bảng chi tiết thu trong <details> (đang đóng)');
    const box = p.locator('.pc-h4-case:not([hidden]) .pc-h4-case__imgs'); const bb = await box.boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.2, bb.y + bb.height / 2, { steps: 5 }); await p.mouse.up();
    const v1 = await p.evaluate(() => +document.querySelector('.pc-h4-case:not([hidden]) .pc-h4-case__ba').getAttribute('aria-valuenow'));
    ok(v1 >= 15 && v1 <= 25, `kéo chuột sang trái ⇒ thanh ở ${v1}%`);
    await p.keyboard.press('End'); const v2 = await p.evaluate(() => +document.querySelector('.pc-h4-case:not([hidden]) .pc-h4-case__ba').getAttribute('aria-valuenow'));
    await p.keyboard.press('ArrowLeft'); const v3 = await p.evaluate(() => +document.querySelector('.pc-h4-case:not([hidden]) .pc-h4-case__ba').getAttribute('aria-valuenow'));
    ok(v2 === 100 && v3 === 95, `phím End ⇒ ${v2}%, ← ⇒ ${v3}%`);
    if (SHOT) { await p.keyboard.press('Home'); for (let i = 0; i < 10; i++) await p.keyboard.press('ArrowRight'); await sec.screenshot({ path: `${SHOT}-cases-${n}.png` }); }
    await p.locator('.pc-h4-case:not([hidden]) .pc-h4-case__more > summary').click(); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.pc-h4-case:not([hidden]) .pc-h4-case__more').open), 'bấm «Hành trình» ⇒ mở bảng chi tiết');
    // header
    await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(900);
    const h = await p.evaluate(() => { const hd = document.querySelector('header.header'); const lg = hd.querySelector('.pc-sticky-logo img'); const a = hd.querySelector('#nav>.nav-item>a');
      return { st: hd.classList.contains('hSticky'), bar: Math.round(hd.querySelector('.header-menu').getBoundingClientRect().height), logo: lg && Math.round(lg.getBoundingClientRect().height), fw: getComputedStyle(a).fontWeight, wrap: [...hd.querySelectorAll('#nav>.nav-item>a')].some(x => x.getBoundingClientRect().height > 60) }; });
    ok(h.st && h.bar === 64 && h.logo === 40 && h.fw === '500' && !h.wrap, `header dính: thanh ${h.bar}px, logo ${h.logo}px, menu nét ${h.fw}, không xuống dòng`);
  } else {
    ok(!m.ba && !m.chipsVis && m.details === 'none' && m.sum && !m.sameFrame, 'mobile: giữ 2 ảnh vuông cạnh nhau, không thanh kéo / chip / details, có tóm tắt (Main.png)');
    if (SHOT) await sec.screenshot({ path: `${SHOT}-cases-${n}.png` });
  }
  await b.close();
}
console.log(fail ? `FAIL ${fail}` : 'PASS'); process.exit(fail ? 1 : 0);
