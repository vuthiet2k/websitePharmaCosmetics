import { chromium, webkit, devices } from 'playwright';
const SHOT = process.argv[2];
const engines = [['chromium', chromium, { viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true }],
                 ['webkit', webkit, devices['iPhone 13']],
                 ['desk1440', chromium, { viewport:{width:1440,height:900} }]];
let fail = 0; const ok = (c, m) => { console.log((c?'  ✔ ':'  ✗ ')+m); if(!c) fail++; };
for (const [name, eng, ctxOpt] of engines) {
  console.log('==', name);
  const b = await eng.launch(); const ctx = await b.newContext(ctxOpt); const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message));
  await p.goto('http://localhost:3000/', { waitUntil:'networkidle', timeout:90000 }); await p.waitForTimeout(800); await p.waitForSelector('.pc-widget-dismiss', {state:'attached'}); await p.waitForTimeout(1500); await p.addStyleTag({content:'#dev-toolbar{display:none!important}'});
  const m = await p.evaluate(() => {
    const sb = el => el ? { sbw: getComputedStyle(el).scrollbarWidth, gap: el.offsetHeight - el.clientHeight } : null;
    const fs = document.querySelector('.pc-h4-prow--one'), tabs = document.querySelector('.section_featured_products .pc-h4-tabs');
    const cards = [...document.querySelectorAll('.section_featured_products .pc-h4-prow:not([hidden]) .pc-h4-pcard')];
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const btns = cards.map(c => c.querySelector('.pc-h4-pcard__a .pc-btn')).filter(Boolean);
    const d = document.querySelector('.pc-widget-dismiss'); const dr = d && d.getBoundingClientRect();
    return { fs: sb(fs), tabs: sb(tabs), cards: cards.length, btnVis: btns.filter(vis).length, btnH: btns.filter(vis).map(x=>Math.round(x.getBoundingClientRect().height)),
      dismiss: dr && [Math.round(dr.x), Math.round(dr.y), Math.round(dr.width), Math.round(dr.height)], dVis: d && vis(d), vw: innerWidth };
  });
  console.log('  ', JSON.stringify(m));
  ok(m.fs && (m.fs.sbw === 'none' && m.fs.gap === 0 || m.vw >= 1024), 'Flash sale không thanh cuộn');
  ok(!m.tabs || m.tabs.sbw === 'none' || m.vw >= 1024, 'Tab Bán chạy không thanh cuộn');
  ok(m.cards > 0 && m.btnVis === (m.vw >= 1024 ? 5 : m.cards), `Bán chạy: ${m.btnVis}/${m.cards} thẻ có nút`);
  ok(m.btnH.every(h => h >= 44), 'Nút thẻ cao ≥ 44');
  ok(m.dVis && m.dismiss[2] >= 44 && m.dismiss[3] >= 44 && m.dismiss[0] + m.dismiss[2] <= m.vw, 'Nút X hiện, 44×44, trong màn');
  // kéo robot
  const h = p.locator('#toggle-widget-btn'); const r0 = await h.boundingBox();
  const cx = r0.x + r0.width/2, cy = r0.y + r0.height/2;
  await p.mouse.move(cx, cy); await p.mouse.down();
  for (let i=1;i<=10;i++) await p.mouse.move(cx - i*(m.vw*0.07), cy - i*30);
  await p.mouse.up(); await p.waitForTimeout(500);
  const r1 = await h.boundingBox();
  const opened = await p.evaluate(() => document.querySelector('.main-widget').classList.contains('widget-opened'));
  const left = await p.evaluate(() => document.querySelector('.main-widget').classList.contains('pc-widget--left'));
  ok(r1.y < r0.y - 200, `Kéo lên: y ${Math.round(r0.y)} → ${Math.round(r1.y)}`);
  ok(left && r1.x < 40, `Hít mép trái (x=${Math.round(r1.x)})`);
  ok(!opened, 'Kéo xong không mở bảng liên hệ');
  // bấm thường vẫn mở bảng
  await h.click(); await p.waitForTimeout(500);
  const pr = await p.evaluate(() => { const w=document.querySelector('.main-widget'); const r=w.querySelector('.def-content').getBoundingClientRect(); return {o:w.classList.contains('widget-opened'), l:Math.round(r.left), r:Math.round(r.right)}; });
  ok(pr.o && pr.l >= 0 && pr.r <= m.vw, `Bấm mở bảng, bảng trong màn (${pr.l}..${pr.r})`);
  if (SHOT) await p.screenshot({ path: `${SHOT}-${name}-open.png` });
  await h.click(); await p.waitForTimeout(300);
  // robot ở cao: bảng phải nằm trọn trong màn (lật xuống dưới)
  { const rb = await h.boundingBox(); await p.mouse.move(rb.x+30, rb.y+30); await p.mouse.down(); for (let i=1;i<=10;i++) await p.mouse.move(rb.x+30, rb.y+30 - i*150); await p.mouse.up(); await p.waitForTimeout(400);
    await h.click(); await p.waitForTimeout(600);
    const q = await p.evaluate(() => { const r=document.querySelector('.main-widget .def-content').getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), vh: innerHeight }; });
    ok(q.t >= 0 && q.b <= q.vh, `Robot ở cao: bảng trong màn (${q.t}..${q.b} / ${q.vh})`);
    if (SHOT) await p.screenshot({ path: `${SHOT}-${name}-below.png` }); }
  await h.click(); await p.waitForTimeout(300);
  // kéo vượt lên trên ⇒ bị chặn dưới header
  const r2 = await h.boundingBox(); await p.mouse.move(r2.x+30, r2.y+30); await p.mouse.down();
  for (let i=1;i<=10;i++) await p.mouse.move(r2.x+30, r2.y+30 - i*150); await p.mouse.up(); await p.waitForTimeout(400);
  const r3 = await h.boundingBox(); ok(r3.y >= 0, `Không kéo ra khỏi màn (y=${Math.round(r3.y)})`);
  // tải lại giữ vị trí
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(600);
  await p.addStyleTag({content:'#dev-toolbar{display:none!important}'}); const r4 = await h.boundingBox(); ok(Math.abs(r4.y - r3.y) < 4 && r4.x < 40, `Tải lại giữ vị trí (y=${Math.round(r4.y)})`);
  // nút X ẩn
  await p.locator('.pc-widget-dismiss').click(); await p.waitForTimeout(300);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.main-widget')).display === 'none'), 'Nút X ẩn robot');
  if (SHOT && name !== 'desk1440') { await p.evaluate(()=>{sessionStorage.clear(); localStorage.clear();}); await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(600);
    await p.evaluate(() => document.querySelector('.section_featured_products').scrollIntoView()); await p.waitForTimeout(400); await p.screenshot({ path: `${SHOT}-${name}-feat.png` }); }
  ok(errs.length === 0, 'Không lỗi JS ' + errs.join(' | '));
  await b.close();
}
console.log(fail ? `FAIL ${fail}` : 'PASS'); process.exit(fail?1:0);
