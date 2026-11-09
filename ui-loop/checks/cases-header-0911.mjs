// 09/11/2026 — «Kết quả thực tế» laptop: khối 6:6 — trái tiêu đề + tab ca, phải thẻ ca dạng card (2 ảnh TRƯỚC / SAU riêng ở trên, không thanh
// kéo; dưới: dải nhãn mảnh, tóm tắt 2 dòng, 1 hàng chân «Hành trình ▾» + «Xem chi tiết ca»); + header desktop (thanh dính 64px,
// logo 40px, menu nét 500). Mobile 390 «Kết quả thực tế» giữ nguyên (Main.png).
import { chromium, webkit, devices } from 'playwright';
const SHOT = process.argv[2];
let fail = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✗ ') + m); if (!c) fail++; };
for (const [n, eng, opt] of [['1440', chromium, { viewport: { width: 1440, height: 900 } }], ['1024', chromium, { viewport: { width: 1024, height: 800 } }], ['1280-webkit', webkit, { viewport: { width: 1280, height: 800 } }], ['390', chromium, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['iphone13', webkit, devices['iPhone 13']]]) {
  console.log('==', n); const b = await eng.launch(); const p = await b.newPage(opt);
  await p.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 90000 }); await p.addStyleTag({ content: '#dev-toolbar,.main-widget{display:none!important}' }); await p.waitForTimeout(800);
  const sec = p.locator('section[aria-labelledby="pc-h4-testi-title"]'); await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  const m = await p.evaluate(() => { const R = e => e.getBoundingClientRect(); const s = document.querySelector('section[aria-labelledby="pc-h4-testi-title"]');
    const c = s.querySelector('.pc-h4-case:not([hidden])'); const imgs = [...c.querySelectorAll('.pc-h4-case__img')].map(R);
    const tabs = [...s.querySelectorAll('.pc-h4-case-tab')].map(R); const side = R(s.querySelector('.pc-h4-cases__side')); const t = R(c.querySelector('.pc-h4-case__t')); const d = c.querySelector('.pc-h4-case__more'); const go = c.querySelector('.pc-h4-case__ft .pc-h4-go');
    const chips = [...c.querySelectorAll('.pc-h4-case__chips li')]; const vis = e => !!e && getComputedStyle(e).display !== 'none';
    return { w: innerWidth, secH: Math.round(R(s).height), caseH: Math.round(R(c).height), cols: [Math.round(side.width), Math.round(R(c).width)], caseRight: R(c).left >= side.right, imgsAbove: imgs.length > 0 && t.top >= imgs[0].bottom, tabH: Math.min(...tabs.map(x => Math.round(x.height))),
      sideBySide: imgs.length === 2 && Math.abs(imgs[0].top - imgs[1].top) < 1 && imgs[1].left >= imgs[0].right, imgH: Math.round(imgs[0].height),
      slider: !!c.querySelector('[role="slider"]'), chipsVis: chips.length > 0 && vis(c.querySelector('.pc-h4-case__chips')), chipH: chips.length ? Math.round(R(chips[0]).height) : 0,
      details: d && getComputedStyle(d).display, open: d && d.open, oneRow: !!(d && go && Math.abs(R(d).top - R(go).top) < 4), sum: vis(c.querySelector('.pc-h4-case__sum')) }; });
  console.log('  ', JSON.stringify(m));
  ok(m.sideBySide && !m.slider, `2 ảnh TRƯỚC / SAU riêng, cạnh nhau, không thanh kéo (ảnh cao ${m.imgH}px)`);
  if (m.w >= 1024) {
    ok(m.caseRight && Math.abs(m.cols[0] - m.cols[1]) <= 2 && m.tabH >= 44, `khối 6:6 — cột trái ${m.cols[0]}px / thẻ ca ${m.cols[1]}px, tab cao ≥ 44 (${m.tabH})`);
    ok(m.imgsAbove, 'thẻ ca: 2 ảnh ở trên, nội dung bên dưới');
    ok(m.chipsVis && m.chipH <= 30 && m.sum, `dải nhãn mảnh (${m.chipH}px) + tóm tắt`);
    ok(m.details !== 'none' && !m.open && m.oneRow, '«Hành trình ▾» và «Xem chi tiết ca» cùng 1 hàng, bảng chi tiết đang đóng');
    await p.locator('.pc-h4-case:not([hidden]) .pc-h4-case__more > summary').click(); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.pc-h4-case:not([hidden]) .pc-h4-case__more').open), 'bấm «Hành trình» ⇒ mở bảng chi tiết');
    if (SHOT) { await p.locator('.pc-h4-case:not([hidden]) .pc-h4-case__more > summary').click(); await p.waitForTimeout(300); await sec.screenshot({ path: `${SHOT}-cases-${n}.png` }); }
    await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(900);
    const h = await p.evaluate(() => { const hd = document.querySelector('header.header'); const lg = hd.querySelector('.pc-sticky-logo img'); const a = hd.querySelector('#nav>.nav-item>a');
      return { st: hd.classList.contains('hSticky'), bar: Math.round(hd.querySelector('.header-menu').getBoundingClientRect().height), logo: lg && Math.round(lg.getBoundingClientRect().height), fw: getComputedStyle(a).fontWeight, wrap: [...hd.querySelectorAll('#nav>.nav-item>a')].some(x => x.getBoundingClientRect().height > 60) }; });
    ok(h.st && h.bar === 64 && h.logo === 40 && h.fw === '500' && !h.wrap, `header dính: thanh ${h.bar}px, logo ${h.logo}px, menu nét ${h.fw}, không xuống dòng`);
  } else {
    ok(!m.chipsVis && m.details === 'none' && m.sum, 'mobile: không nhãn / details, có tóm tắt (Main.png như cũ)');
    if (SHOT) await sec.screenshot({ path: `${SHOT}-cases-${n}.png` });
  }
  await b.close();
}
console.log(fail ? `FAIL ${fail}` : 'PASS'); process.exit(fail ? 1 : 0);
