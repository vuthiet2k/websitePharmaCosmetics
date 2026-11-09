// L03b38 (vòng 107, 09/11/2026 — chạy lại: node ui-loop/checks/L03b38.mjs before|after [khung,khung]).
// Việc: dấu tick bước «xong» ở thanh tiến trình /order-tracking dùng glyph Font Awesome trong CSS pseudo
//   (.ot-step--done .ot-step__dot::after content '\f00c') → ui_icon check size em trong <i data-ot-check> (JS bật/tắt hidden).
// Bước «xong» chỉ dựng khi tra cứu thành công ⇒ giả lập phản hồi GAS (script.google.com) bằng route Playwright — không sửa dev-server.
// Kịch bản: gửi trống ⇒ báo lỗi; gõ mã + SĐT ⇒ PAID (4 bước xong) và PAYMENT_REPORTED (2 xong, bước 3 đang);
//   «Tra cứu đơn khác» ⇒ form hiện lại.
// Đo mỗi bước: tick nhìn thấy?, hộp tick (FA: đo hộp glyph bằng span ẩn cùng font; SVG: rect), lệch tâm trong chấm, màu, cỡ chấm.
// Ảnh: ui-loop/evidence/L03b38/<mode>-<trình duyệt>-<khung>-<kịch bản>.png (+ -stepper.png cận thanh tiến trình)
import { chromium, webkit, devices } from 'playwright';
import fs from 'node:fs';
const MODE = process.argv[2] || 'after';
const OUT = 'ui-loop/evidence/L03b38';
fs.mkdirSync(OUT, { recursive: true });
const LOG = `${OUT}/${MODE}-run.txt`; fs.writeFileSync(LOG, '');
const _log = console.log; console.log = (...a) => { _log(...a); fs.appendFileSync(LOG, a.join(' ') + '\n'); };
const URL_ = 'http://localhost:3000/order-tracking';
const mob = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const FRAMES = [
  ['chromium', '390', chromium, mob(390, 844)],
  ['webkit', 'iphone13', webkit, devices['iPhone 13']],
  ['chromium', '1440', chromium, { viewport: { width: 1440, height: 900 } }],
  ['chromium', '320', chromium, mob(320, 568)],
  ['chromium', '768', chromium, { viewport: { width: 768, height: 1024 } }],
  ['chromium', '1024', chromium, { viewport: { width: 1024, height: 768 } }],
  ['chromium', '844x390', chromium, mob(844, 390)],
].filter(([, fr]) => !process.argv[3] || process.argv[3].split(',').includes(fr));
const SCEN = {
  paid: { success: true, status: 'PAID', order_id: 'ORD-20261109-0001', total_amount: 550000, pay_amount: 0,
    items: [{ name: 'Serum Vitamin C 15%', qty: 1, price: 550000 }] },
  reported: { success: true, status: 'PAYMENT_REPORTED', order_id: 'ORD-20261109-0002', total_amount: 320000, pay_amount: 320000,
    transaction_ref: 'PC0002', items: [{ name: 'Kem chống nắng', qty: 2, lineTotal: 320000 }] },
};
const before = MODE === 'after' && fs.existsSync(`${OUT}/before.json`) ? JSON.parse(fs.readFileSync(`${OUT}/before.json`, 'utf8')) : null;
const data = {}; const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✗'} ${msg}`); if (!cond) fails.push(msg); };
const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

const measure = (p) => p.evaluate(() => {
  const steps = [];
  for (const st of document.querySelectorAll('.ot-step')) {
    const dot = st.querySelector('.ot-step__dot'); const dr = dot.getBoundingClientRect();
    const af = getComputedStyle(dot, '::after'); const faAfter = af.content && af.content !== 'none' && /Font Awesome/i.test(af.fontFamily);
    const chk = st.querySelector('[data-ot-check]'); const svg = chk?.querySelector('svg');
    let tick = null;
    if (faAfter) {
      const s = document.createElement('span'); s.textContent = af.content.replace(/^"|"$/g, '');
      s.style.cssText = `position:absolute;left:-9999px;top:0;font-family:${af.fontFamily};font-weight:${af.fontWeight};font-size:${af.fontSize};line-height:1;white-space:nowrap`;
      document.body.appendChild(s); const gw = s.getBoundingClientRect().width; s.remove();
      const fs = parseFloat(af.fontSize);
      // ::after là flex item căn giữa trong chấm ⇒ tâm glyph ≈ tâm chấm (đo hộp theo cỡ chữ)
      tick = { kind: 'fa', w: +gw.toFixed(1), h: +fs.toFixed(1), dx: 0, dy: 0, color: af.color, glyphW: +gw.toFixed(1) };
    } else if (svg) {
      const r = svg.getBoundingClientRect(); const c = getComputedStyle(chk);
      if (r.width > 0 && r.height > 0 && c.display !== 'none' && c.visibility !== 'hidden') {
        tick = { kind: 'svg', w: +r.width.toFixed(1), h: +r.height.toFixed(1),
          dx: +(r.x + r.width / 2 - (dr.x + dr.width / 2)).toFixed(1), dy: +(r.y + r.height / 2 - (dr.y + dr.height / 2)).toFixed(1),
          color: getComputedStyle(svg).color, stroke: getComputedStyle(svg).stroke, aria: chk.getAttribute('aria-hidden') };
      }
    }
    const lbl = st.querySelector('.ot-step__label');
    steps.push({ cls: st.className.replace('ot-step', '').trim() || '-', dot: `${dr.width.toFixed(1)}x${dr.height.toFixed(1)}`,
      dotBg: getComputedStyle(dot).backgroundColor, label: lbl.textContent.trim(), lblColor: getComputedStyle(lbl).color, tick });
  }
  // Mọi pseudo-element còn dùng font Font Awesome trong trang
  let faPseudo = 0;
  for (const e of document.querySelectorAll('body *')) for (const ps of ['::before', '::after']) {
    const c = getComputedStyle(e, ps); if (c.content && c.content !== 'none' && c.content !== 'normal' && /Font Awesome|FontAwesome/i.test(c.fontFamily)) faPseudo++;
  }
  const sp = document.querySelector('#ot-stepper').getBoundingClientRect();
  return { steps, faPseudo, faI: [...document.querySelectorAll('i')].filter((i) => /(^|\s)fa-|(^|\s)fa[srb]?(\s|$)/.test(i.className) && i.getBoundingClientRect().width > 0).length,
    stepper: `${sp.width.toFixed(1)}x${sp.height.toFixed(1)}`, docH: document.documentElement.scrollHeight,
    pcErr: (document.documentElement.outerHTML.match(/PC-ERROR ui_icon/g) || []).length,
    resultVisible: getComputedStyle(document.getElementById('ot-result')).display !== 'none' };
});

for (const [brn, fr, br, opt] of FRAMES) {
  const b = await br.launch();
  const key = `${brn}-${fr}`; data[key] = {};
  const ctx = await b.newContext({ ...opt, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  let scen = 'paid';
  await p.route('**/script.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SCEN[scen]) }));
  await p.goto(URL_, { waitUntil: 'load' });
  await p.evaluate(() => document.getElementById('dev-toolbar')?.remove());
  await p.waitForTimeout(800);
  // Gửi trống ⇒ báo lỗi
  await p.click('#ot-search-btn');
  const errTxt = await p.$eval('#ot-error', (e) => (getComputedStyle(e).display !== 'none' ? e.textContent.trim() : ''));
  data[key].emptyErr = errTxt;
  for (const sc of ['paid', 'reported']) {
    scen = sc;
    if (sc === 'reported') { await p.click('#ot-btn-new'); await p.waitForTimeout(200);
      data[key].formBack = await p.$eval('#ot-form-card', (e) => getComputedStyle(e).display !== 'none'); }
    await p.fill('#ot-order-id', SCEN[sc].order_id);
    await p.fill('#ot-phone', '0901 234 567');
    await p.click('#ot-search-btn');
    await p.waitForFunction(() => getComputedStyle(document.getElementById('ot-result')).display !== 'none', null, { timeout: 8000 });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(500);
    const m = await measure(p);
    data[key][sc] = m;
    await p.locator('#ot-stepper').scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${sc}.png` });
    await p.locator('#ot-stepper').screenshot({ path: `${OUT}/${MODE}-${brn}-${fr}-${sc}-stepper.png` }).catch(() => {});
  }
  data[key].errs = errs;
  await b.close();

  const d = data[key];
  console.log(`\n[${key}] gửi trống ⇒ "${d.emptyErr}" · form hiện lại: ${d.formBack}`);
  for (const sc of ['paid', 'reported']) {
    const m = d[sc];
    console.log(`  ${sc}: stepper ${m.stepper} · cao trang ${m.docH} · faPseudo ${m.faPseudo} · <i fa> ${m.faI} · PC-ERROR ${m.pcErr}`);
    m.steps.forEach((s, i) => console.log(`    bước ${i + 1} [${s.cls}] chấm ${s.dot} «${s.label}» tick: ${s.tick ? `${s.tick.kind} ${s.tick.w}×${s.tick.h} lệch (${s.tick.dx},${s.tick.dy}) ${s.tick.color}` : '—'}`));
  }
  if (MODE === 'after') {
    const bf = before?.[key];
    ok(!!bf, `${key}: có số đo before`);
    if (!bf) continue;
    ok(d.emptyErr && d.emptyErr === bf.emptyErr, `${key}: gửi trống báo lỗi «${d.emptyErr}» = before`);
    ok(d.formBack === true, `${key}: «Tra cứu đơn khác» ⇒ form hiện lại`);
    for (const sc of ['paid', 'reported']) {
      const m = d[sc], o = bf[sc];
      const nA = m.steps.filter((s) => s.tick).length, nB = o.steps.filter((s) => s.tick).length;
      ok(nA === nB && nA === (sc === 'paid' ? 4 : 2), `${key} ${sc}: số tick nhìn thấy ${nA} = before ${nB}`);
      ok(m.faPseudo === 0 && m.faI === 0, `${key} ${sc}: 0 glyph Font Awesome (pseudo ${m.faPseudo}, <i> ${m.faI})`);
      ok(m.pcErr === 0, `${key} ${sc}: PC-ERROR 0`);
      m.steps.forEach((s, i) => {
        const t = s.tick, tb = o.steps[i].tick;
        ok(s.cls === o.steps[i].cls && s.dot === o.steps[i].dot && s.label === o.steps[i].label, `${key} ${sc} bước ${i + 1}: trạng thái/chấm ${s.dot}/nhãn = before`);
        ok(s.dotBg === o.steps[i].dotBg && s.lblColor === o.steps[i].lblColor, `${key} ${sc} bước ${i + 1}: màu chấm/nhãn = before`);
        if (t && tb) {
          ok(Math.abs(t.h - tb.h) <= 1 && Math.abs(t.w - tb.w) <= 2, `${key} ${sc} bước ${i + 1}: tick ${t.w}×${t.h} ~ glyph cũ ${tb.w}×${tb.h} (cao lệch ≤ 1, rộng ≤ 2)`);
          ok(Math.abs(t.dx) <= 2 && Math.abs(t.dy) <= 2, `${key} ${sc} bước ${i + 1}: lệch tâm trong chấm (${t.dx},${t.dy}) ≤ 2px`);
          const dc = Math.max(...rgb(t.color).map((v, k) => Math.abs(v - rgb(tb.color)[k])));
          ok(dc <= 10, `${key} ${sc} bước ${i + 1}: màu tick ΔRGB ${dc} ≤ 10`);
          ok(t.aria === 'true', `${key} ${sc} bước ${i + 1}: tick aria-hidden`);
        }
      });
      ok(Math.abs(m.docH - o.docH) <= 2, `${key} ${sc}: cao trang ${m.docH} vs ${o.docH} (≤ 2px)`);
      ok(m.stepper === o.stepper, `${key} ${sc}: thanh tiến trình ${m.stepper} = before`);
    }
    ok(d.errs.length === 0, `${key}: 0 lỗi JS ${d.errs.join(' | ')}`);
  }
}
if (MODE === 'before') fs.writeFileSync(`${OUT}/before.json`, JSON.stringify(data, null, 1));
else fs.writeFileSync(`${OUT}/after.json`, JSON.stringify(data, null, 1));
console.log(`\n${MODE}: ${fails.length} ✗`);
process.exit(fails.length ? 1 : 0);
